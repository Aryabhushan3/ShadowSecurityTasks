import { client } from './supabase';
import { addDays, deriveWorkspace, todayISO, type RawWorkspace } from './derive';
import type { ContentItem, Lab, LabComment, Meeting, Note, Profile, Task, Workspace } from './types';

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const nowIso = () => new Date().toISOString();

/** Turns a Supabase error into something a non-technical user can act on. */
function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) {
    console.error(`[COO OS] ${what}:`, result.error);
    throw new Error(`Couldn't ${what}. Please try again.`);
  }
  return (result.data ?? []) as T;
}

async function logActivity(profileId: string | null, action: string, entityType: string, entityId?: string) {
  const { error } = await client().from('activity').insert({
    id: uid('act'), profile_id: profileId, action, entity_type: entityType,
    entity_id: entityId ?? null, created_at: nowIso(),
  });
  if (error) console.error('[COO OS] activity log failed:', error);
}

/** Sends someone a notification. Never blocks the calling action if it fails. */
async function notify(profileId: string | null | undefined, message: string) {
  if (!profileId) return;
  const { error } = await client().from('notifications').insert({
    id: uid('notif'), profile_id: profileId, message, read: false, created_at: nowIso(),
  });
  if (error) console.error('[COO OS] notification failed:', error);
}

/** Loads every table the workspace needs, then computes the derived views. */
export async function loadWorkspace(): Promise<Workspace> {
  const sb = client();
  const [
    profiles, projects, tasks, checklist, comments, content,
    platforms, milestones, meetings, notes, activity, notifications, attachments, announcements, settings,
  ] = await Promise.all([
    sb.from('profiles').select('*').eq('active', true).order('access_role', { ascending: false }).order('name'),
    sb.from('projects').select('*').order('deadline', { nullsFirst: false }),
    sb.from('tasks').select('*').eq('archived', false).order('position'),
    sb.from('checklist_items').select('*').order('position'),
    sb.from('comments').select('*').order('created_at'),
    sb.from('content_items').select('*').order('position'),
    sb.from('platforms').select('*').eq('active', true).order('name'),
    sb.from('milestones').select('*').order('due_date', { nullsFirst: false }),
    sb.from('meeting_notes').select('*').order('meeting_date', { ascending: false }),
    sb.from('notes').select('*').order('pinned', { ascending: false }).order('updated_at', { ascending: false }),
    sb.from('activity').select('*').order('created_at', { ascending: false }).limit(100),
    sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
    sb.from('attachments').select('*').order('created_at', { ascending: false }),
    sb.from('announcements').select('*').eq('active', true).order('created_at', { ascending: false }),
    sb.from('settings').select('*'),
  ]);

  // Labs live in their own tables, added by a later migration. If that SQL has
  // not been run yet, the rest of the workspace must still open normally.
  const [labsRes, labCommentsRes] = await Promise.all([
    sb.from('labs').select('*').order('position'),
    sb.from('lab_comments').select('*').order('created_at'),
  ]);
  const labsReady = !labsRes.error && !labCommentsRes.error;
  if (!labsReady) console.warn('[COO OS] labs tables not available yet:', labsRes.error ?? labCommentsRes.error);

  const profileRows = unwrap<Profile[]>(profiles, 'load the team');
  const settingsRows = unwrap<{ key: string; value: string }[]>(settings, 'load settings');
  const activityRows = unwrap<RawWorkspace['activity']>(activity, 'load activity');
  const nameById = new Map(profileRows.map(p => [p.id, p.name]));

  const raw: RawWorkspace = {
    profiles: profileRows,
    projects: unwrap(projects, 'load projects'),
    tasks: unwrap(tasks, 'load tasks'),
    checklist: unwrap(checklist, 'load checklists'),
    comments: unwrap(comments, 'load comments'),
    content: unwrap(content, 'load content'),
    platforms: unwrap(platforms, 'load platforms'),
    milestones: unwrap(milestones, 'load milestones'),
    meetings: unwrap(meetings, 'load meeting notes'),
    notes: unwrap(notes, 'load notes'),
    activity: activityRows.map(a => ({ ...a, profile_name: a.profile_id ? nameById.get(a.profile_id) : undefined })),
    notifications: unwrap(notifications, 'load notifications'),
    attachments: unwrap(attachments, 'load attachments'),
    announcements: unwrap(announcements, 'load announcements'),
    labs: labsReady ? ((labsRes.data ?? []) as Lab[]).map(l => ({ ...l, checklist: Array.isArray(l.checklist) ? l.checklist : [] })) : [],
    labComments: labsReady ? (labCommentsRes.data ?? []) as LabComment[] : [],
    labsReady,
    settings: Object.fromEntries(settingsRows.map(s => [s.key, s.value])),
  };

  return deriveWorkspace(raw, todayISO());
}

// ---------- Tasks ----------

export interface NewTask {
  title: string; description?: string; assignee_id?: string | null; project_id?: string | null;
  status?: Task['status']; priority?: Task['priority'];
  due_date?: string | null; start_date?: string | null; follow_up_date?: string | null;
  recurrence?: Task['recurrence']; recur_interval_days?: number | null;
}

async function insertOneTask(input: NewTask, actorId: string) {
  const title = input.title.trim();
  if (!title) throw new Error('Please give the task a name.');
  const id = uid('task');
  const { error } = await client().from('tasks').insert({
    id, title,
    description: input.description || '',
    assignee_id: input.assignee_id || null,
    project_id: input.project_id || null,
    status: input.status || 'todo',
    priority: input.priority || 'medium',
    due_date: input.due_date || null,
    start_date: input.start_date || null,
    follow_up_date: input.follow_up_date || null,
    recurrence: input.recurrence || 'none',
    recur_interval_days: input.recurrence === 'custom' ? (input.recur_interval_days || 1) : null,
    created_at: nowIso(), updated_at: nowIso(),
  });
  if (error) { console.error(error); throw new Error("Couldn't create the task. Please try again."); }
  await logActivity(actorId, `created "${title}"`, 'task', id);
  if (input.assignee_id && input.assignee_id !== actorId) {
    await notify(input.assignee_id, `You were assigned a new task: "${title}"`);
  }
  return id;
}

export async function createTask(input: NewTask, actorId: string) {
  return insertOneTask(input, actorId);
}

/** Creates the same task once per selected teammate, so each person gets their own copy to complete. */
export async function createTaskForMany(input: NewTask, assigneeIds: string[], actorId: string) {
  const ids = assigneeIds.length ? assigneeIds : [input.assignee_id || null];
  const created: string[] = [];
  for (const personId of ids) {
    created.push(await insertOneTask({ ...input, assignee_id: personId }, actorId));
  }
  return created;
}

/** Recurrence step in days used to schedule the next occurrence. */
function recurrenceDays(recurrence: Task['recurrence'], customDays: number | null): number | null {
  if (recurrence === 'daily') return 1;
  if (recurrence === 'weekly') return 7;
  if (recurrence === 'monthly') return 30;
  if (recurrence === 'custom') return customDays && customDays > 0 ? customDays : null;
  return null;
}

export async function updateTask(id: string, patch: Partial<Task>, actorId: string, previous?: Task) {
  const { error } = await client().from('tasks').update({ ...patch, updated_at: nowIso() }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't save the change. Please try again."); }
  const title = patch.title ?? previous?.title ?? 'a task';
  const moved = patch.status && patch.status !== previous?.status;
  await logActivity(
    actorId,
    moved ? `moved "${title}" to ${patch.status!.replace('_', ' ')}` : `updated "${title}"`,
    'task', id,
  );
  const newAssignee = patch.assignee_id;
  if (newAssignee && newAssignee !== previous?.assignee_id && newAssignee !== actorId) {
    await notify(newAssignee, `You were assigned to "${title}"`);
  }
  // If a recurring task was just completed, schedule its next occurrence.
  if (patch.status === 'done' && previous && previous.recurrence !== 'none') {
    const days = recurrenceDays(previous.recurrence, previous.recur_interval_days);
    if (days) {
      const nextDue = previous.due_date ? addDays(previous.due_date, days) : addDays(todayISO(), days);
      await createTask({
        title: previous.title,
        description: previous.description,
        assignee_id: previous.assignee_id,
        project_id: previous.project_id,
        priority: previous.priority,
        due_date: nextDue,
        recurrence: previous.recurrence,
        recur_interval_days: previous.recur_interval_days,
      }, actorId);
    }
  }
}

export async function archiveTask(id: string, title: string, actorId: string) {
  const { error } = await client().from('tasks').update({ archived: true, updated_at: nowIso() }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't archive the task. Please try again."); }
  await logActivity(actorId, `archived "${title}"`, 'task', id);
}

// ---------- Checklist & comments ----------

export async function addChecklistItem(taskId: string, text: string) {
  const value = text.trim();
  if (!value) throw new Error('Please type the checklist item first.');
  const { error } = await client().from('checklist_items')
    .insert({ id: uid('check'), task_id: taskId, text: value, completed: false, position: Date.now() });
  if (error) { console.error(error); throw new Error("Couldn't add the checklist item."); }
}

export async function setChecklistItem(id: string, completed: boolean) {
  const { error } = await client().from('checklist_items').update({ completed }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't update the checklist."); }
}

export async function deleteChecklistItem(id: string) {
  const { error } = await client().from('checklist_items').delete().eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't remove the checklist item."); }
}

export async function addComment(taskId: string, body: string, profileId: string) {
  const value = body.trim();
  if (!value) throw new Error('Please write the comment first.');
  const { error } = await client().from('comments')
    .insert({ id: uid('comment'), task_id: taskId, profile_id: profileId, body: value, created_at: nowIso() });
  if (error) { console.error(error); throw new Error("Couldn't post the comment."); }
  await logActivity(profileId, 'commented on a task', 'task', taskId);
  const { data: task } = await client().from('tasks').select('title, assignee_id').eq('id', taskId).maybeSingle();
  if (task?.assignee_id && task.assignee_id !== profileId) {
    await notify(task.assignee_id, `New comment on "${task.title}"`);
  }
}

// ---------- Attachments ----------

const ATTACHMENTS_BUCKET = 'task-attachments';

export async function listAttachmentUrl(filePath: string): Promise<string> {
  const { data, error } = await client().storage.from(ATTACHMENTS_BUCKET).createSignedUrl(filePath, 3600);
  if (error || !data) throw new Error("Couldn't open that file.");
  return data.signedUrl;
}

export async function uploadAttachment(taskId: string, file: File, actorId: string) {
  const path = `${taskId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await client().storage.from(ATTACHMENTS_BUCKET).upload(path, file);
  if (uploadError) { console.error(uploadError); throw new Error("Couldn't upload the file. Please try again."); }
  const { error } = await client().from('attachments').insert({
    id: uid('file'), task_id: taskId, file_name: file.name, file_path: path,
    file_size: file.size, uploaded_by: actorId, created_at: nowIso(),
  });
  if (error) { console.error(error); throw new Error("Couldn't save the file record."); }
  await logActivity(actorId, `attached "${file.name}"`, 'task', taskId);
}

export async function deleteAttachment(id: string, filePath: string) {
  await client().storage.from(ATTACHMENTS_BUCKET).remove([filePath]);
  const { error } = await client().from('attachments').delete().eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't remove the attachment."); }
}

// ---------- Notifications ----------

export async function markNotificationRead(id: string) {
  const { error } = await client().from('notifications').update({ read: true }).eq('id', id);
  if (error) console.error('[COO OS] mark notification read failed:', error);
}

export async function markAllNotificationsRead(profileId: string) {
  const { error } = await client().from('notifications').update({ read: true }).eq('profile_id', profileId).eq('read', false);
  if (error) console.error('[COO OS] mark all notifications read failed:', error);
}

// ---------- Projects ----------

export async function createProject(
  input: { name?: string; title?: string; description?: string; owner_id?: string | null; deadline?: string | null; team?: string[] },
  actorId: string,
) {
  const name = (input.name ?? input.title ?? '').trim();
  if (!name) throw new Error('Please give the project a name.');
  const id = uid('project');
  const { error } = await client().from('projects').insert({
    id, name,
    description: input.description || '',
    owner_id: input.owner_id || null,
    team: input.team ?? [actorId],
    status: 'planning',
    deadline: input.deadline || null,
    progress: 0,
    created_at: nowIso(), updated_at: nowIso(),
  });
  if (error) { console.error(error); throw new Error("Couldn't create the project. Please try again."); }
  await logActivity(actorId, `created project "${name}"`, 'project', id);
  return id;
}

export async function updateProject(id: string, patch: Record<string, unknown>) {
  const { error } = await client().from('projects').update({ ...patch, updated_at: nowIso() }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't save the project."); }
}

export async function deleteProject(id: string, name: string, actorId: string) {
  const { error } = await client().from('projects').delete().eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't delete the project."); }
  await logActivity(actorId, `deleted project "${name}"`, 'project', id);
}

// ---------- Content ----------

export async function createContent(input: Partial<ContentItem> & { title: string }, actorId: string) {
  const title = input.title.trim();
  if (!title) throw new Error('Please give the content a title.');
  const id = uid('content');
  const { error } = await client().from('content_items').insert({
    id, title,
    platform_id: input.platform_id || null,
    content_type: input.content_type || '',
    owner_id: input.owner_id || null,
    publish_date: input.publish_date || null,
    stage: input.stage || 'idea',
    approval_status: 'draft',
    brief: input.brief || '',
    position: Date.now(),
    created_at: nowIso(), updated_at: nowIso(),
  });
  if (error) { console.error('[COO OS] createContent failed:', error); throw new Error(`Couldn't create the content item: ${error.message}`); }
  await logActivity(actorId, `created content "${title}"`, 'content', id);
  return id;
}

export async function updateContent(id: string, patch: Record<string, unknown>, actorId: string, title = 'content') {
  const { error } = await client().from('content_items').update({ ...patch, updated_at: nowIso() }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't save the content change."); }
  const stage = patch.stage as string | undefined;
  await logActivity(actorId, stage ? `moved "${title}" to ${stage}` : `updated "${title}"`, 'content', id);
}

export async function deleteContent(id: string, title: string, actorId: string) {
  const { error } = await client().from('content_items').delete().eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't delete the content item."); }
  await logActivity(actorId, `deleted content "${title}"`, 'content', id);
}

// ---------- Labs ----------

export const LAB_STAGES = ['idea', 'in_progress', 'review', 'done'] as const;

const labStageName = (stage: string) =>
  ({ idea: 'Idea', in_progress: 'In progress', review: 'Review', done: 'Done' } as Record<string, string>)[stage] || stage;

export interface NewLab {
  title: string; summary?: string; track?: string; difficulty?: Lab['difficulty']; priority?: Lab['priority'];
  owner_id?: string | null; reviewer_id?: string | null; due_date?: string | null; stage?: Lab['stage']; inspiration?: string;
}

export async function createLab(input: NewLab, actorId: string) {
  const title = input.title.trim();
  if (!title) throw new Error('Please give the lab a name.');
  const id = uid('lab');
  const { error } = await client().from('labs').insert({
    id, title,
    stage: input.stage || 'idea',
    track: input.track?.trim() || '',
    difficulty: input.difficulty || 'basic',
    priority: input.priority || 'medium',
    owner_id: input.owner_id || null,
    reviewer_id: input.reviewer_id || null,
    due_date: input.due_date || null,
    summary: input.summary || '',
    inspiration: input.inspiration || '',
    checklist: [],
    position: Date.now(),
    created_by: actorId,
    created_at: nowIso(), updated_at: nowIso(),
  });
  if (error) { console.error('[COO OS] createLab failed:', error); throw new Error(`Couldn't create the lab: ${error.message}`); }
  await logActivity(actorId, `added lab idea "${title}"`, 'lab', id);
  if (input.owner_id && input.owner_id !== actorId) await notify(input.owner_id, `You were asked to build the lab "${title}"`);
  return id;
}

export async function updateLab(id: string, patch: Partial<Lab>, actorId: string, previous?: Lab) {
  const { error } = await client().from('labs').update({ ...patch, updated_at: nowIso() }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't save the lab. You may only edit labs you build or review."); }
  const title = patch.title ?? previous?.title ?? 'a lab';
  const moved = patch.stage && patch.stage !== previous?.stage;
  // Only log meaningful changes, not every keystroke-level text save.
  if (moved) await logActivity(actorId, `moved lab "${title}" to ${labStageName(patch.stage!)}`, 'lab', id);
  if (patch.owner_id && patch.owner_id !== previous?.owner_id && patch.owner_id !== actorId) {
    await notify(patch.owner_id, `You were asked to build the lab "${title}"`);
  }
  // When a lab reaches Review, tell the reviewer it is waiting for them.
  const reviewer = patch.reviewer_id ?? previous?.reviewer_id;
  if (patch.stage === 'review' && previous?.stage !== 'review' && reviewer && reviewer !== actorId) {
    await notify(reviewer, `Lab "${title}" is ready for your review`);
  }
  // When a lab goes back from Review to In progress, tell the builder.
  const owner = patch.owner_id ?? previous?.owner_id;
  if (patch.stage === 'in_progress' && previous?.stage === 'review' && owner && owner !== actorId) {
    await notify(owner, `Lab "${title}" was sent back with review feedback`);
  }
}

export async function deleteLab(id: string, title: string, actorId: string) {
  const { error } = await client().from('labs').delete().eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't delete the lab. Only admins can delete labs."); }
  await logActivity(actorId, `deleted lab "${title}"`, 'lab', id);
}

export async function addLabComment(labId: string, body: string, profileId: string) {
  const value = body.trim();
  if (!value) throw new Error('Please write the comment first.');
  const { error } = await client().from('lab_comments')
    .insert({ id: uid('labc'), lab_id: labId, profile_id: profileId, body: value, created_at: nowIso() });
  if (error) { console.error(error); throw new Error("Couldn't post the comment."); }
  const { data: lab } = await client().from('labs').select('title, owner_id, reviewer_id').eq('id', labId).maybeSingle();
  if (lab) {
    for (const who of new Set([lab.owner_id, lab.reviewer_id])) {
      if (who && who !== profileId) await notify(who, `New comment on lab "${lab.title}"`);
    }
  }
}

// ---------- Team & platforms ----------

export async function addProfile(input: { name: string; role: string; department?: string; email?: string }, actorId: string) {
  const name = input.name.trim(), role = input.role.trim(), email = input.email?.trim();
  if (!name || !role) throw new Error('Name and role are both needed.');
  if (!email) throw new Error('A work email is required so they can sign up.');
  const id = uid('person');
  const { error } = await client().from('profiles').insert({
    id, name, role,
    department: input.department?.trim() || '',
    email,
    active: true, access_role: 'member',
    created_at: nowIso(), updated_at: nowIso(),
  });
  if (error) { console.error(error); throw new Error("Couldn't add the team member. The email may already be in use."); }
  await logActivity(actorId, `added ${name} to the team`, 'profile', id);
  return id;
}

export async function setProfileActive(id: string, active: boolean) {
  const { error } = await client().from('profiles').update({ active, updated_at: nowIso() }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't update the team member."); }
}

export async function updateProfile(id: string, patch: { name?: string; role?: string; department?: string; email?: string }, actorId: string) {
  const clean: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.name !== undefined) { const v = patch.name.trim(); if (!v) throw new Error('Name cannot be empty.'); clean.name = v; }
  if (patch.role !== undefined) { const v = patch.role.trim(); if (!v) throw new Error('Role cannot be empty.'); clean.role = v; }
  if (patch.department !== undefined) clean.department = patch.department.trim();
  if (patch.email !== undefined) { const v = patch.email.trim(); if (!v) throw new Error('Email cannot be empty.'); clean.email = v; }
  const { error } = await client().from('profiles').update(clean).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't save changes. The email may already be in use."); }
  await logActivity(actorId, `updated team member details`, 'profile', id);
}

export async function deleteProfile(id: string, actorId: string) {
  if (id === actorId) throw new Error('You cannot remove your own account.');
  const { error } = await client().from('profiles').delete().eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't remove the team member."); }
  await logActivity(actorId, `removed a team member`, 'profile', id);
}

export async function addPlatform(name: string) {
  const value = name.trim();
  if (!value) throw new Error('Please type the platform name.');
  const { error } = await client().from('platforms').insert({ id: uid('platform'), name: value, active: true });
  if (error) { console.error(error); throw new Error("Couldn't add the platform. It may already exist."); }
}

// ---------- Meetings & notes ----------

export async function createMeeting(
  input: { title: string; meeting_date: string; notes?: string; decisions?: string; action_items?: string },
  actorId: string,
) {
  const title = input.title.trim();
  if (!title) throw new Error('Please give the meeting a title.');
  const items = (input.action_items || '').split('\n').map(t => t.trim()).filter(Boolean)
    .map(text => ({ text, done: false }));
  const id = uid('meeting');
  const { error } = await client().from('meeting_notes').insert({
    id, title,
    meeting_date: input.meeting_date,
    participants: [actorId],
    notes: input.notes || '',
    decisions: input.decisions || '',
    action_items: items,
    created_by: actorId,
    created_at: nowIso(), updated_at: nowIso(),
  });
  if (error) { console.error(error); throw new Error("Couldn't save the meeting note."); }
  return id;
}

export async function convertActionToTask(
  meetingTitle: string,
  input: NewTask,
  assigneeIds: string[],
  actorId: string,
  meeting?: Meeting,
  actionIndex?: number,
) {
  const ids = await createTaskForMany({ ...input, status: 'todo', description: input.description || `Created from meeting: ${meetingTitle}` }, assigneeIds, actorId);
  // Tick the action item off so it isn't converted twice.
  if (meeting && actionIndex !== undefined && meeting.action_items[actionIndex]) {
    const items = meeting.action_items.map((a, i) => i === actionIndex ? { ...a, done: true } : a);
    const { error } = await client().from('meeting_notes').update({ action_items: items, updated_at: nowIso() }).eq('id', meeting.id);
    if (error) console.error('[COO OS] could not tick action item:', error);
  }
  return ids;
}

export async function createNote(input: { title: string; body: string }, actorId: string) {
  const title = input.title.trim();
  if (!title) throw new Error('Please give the note a title.');
  const { error } = await client().from('notes').insert({
    id: uid('note'), title, body: input.body || '',
    created_by: actorId, pinned: false,
    created_at: nowIso(), updated_at: nowIso(),
  });
  if (error) { console.error(error); throw new Error("Couldn't save the note."); }
}

export async function updateNote(id: string, patch: Partial<Note>) {
  const { error } = await client().from('notes').update({ ...patch, updated_at: nowIso() }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't save the note."); }
}

export async function deleteNote(id: string) {
  const { error } = await client().from('notes').delete().eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't delete the note."); }
}

// ---------- Announcements ----------

export async function createAnnouncement(input: { title: string; body?: string }, actorId: string) {
  const title = input.title.trim();
  if (!title) throw new Error('Please give the announcement a title.');
  const { error } = await client().from('announcements').insert({
    id: uid('ann'), title, body: input.body || '', created_by: actorId, active: true, created_at: nowIso(),
  });
  if (error) { console.error(error); throw new Error("Couldn't post the announcement."); }
  await logActivity(actorId, `posted an announcement: "${title}"`, 'announcement');
}

export async function dismissAnnouncement(id: string, actorId: string) {
  const { error } = await client().from('announcements').update({ active: false }).eq('id', id);
  if (error) { console.error(error); throw new Error("Couldn't remove the announcement."); }
  await logActivity(actorId, 'removed an announcement', 'announcement', id);
}

// ---------- Backup ----------

/** Downloads the whole workspace as a dated JSON file the user can keep. */
export function downloadBackup(ws: Workspace) {
  const payload = {
    exported_at: nowIso(),
    workspace: 'Shadow Security COO OS',
    profiles: ws.profiles, projects: ws.projects, tasks: ws.tasks,
    checklist: ws.checklist, comments: ws.comments, content: ws.content,
    platforms: ws.platforms, milestones: ws.milestones, meetings: ws.meetings,
    notes: ws.notes, activity: ws.activity, settings: ws.settings,
    attachments: ws.attachments, announcements: ws.announcements,
    labs: ws.labs, lab_comments: ws.labComments,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shadow-coo-os-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
