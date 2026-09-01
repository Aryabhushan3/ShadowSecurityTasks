import type {
  Activity, Attention, Checklist, Comment, ContentItem, Health, Level, Meeting,
  Milestone, Note, Notification, Platform, Profile, Project, ProjectRow, Task,
  Weekly, Workload, Workspace,
} from './types';

/** Today's date in the viewer's own timezone, as YYYY-MM-DD. */
export function todayISO(base = new Date()): string {
  const d = new Date(base);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T12:00:00`).getTime();
  const b = new Date(`${toIso}T12:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Project health. Deterministic and explainable: every escalation records a reason,
 * so the UI can always say WHY something is at risk.
 */
export function projectHealth(project: ProjectRow, tasks: Task[], today: string): {
  health: Health; reasons: string[]; taskCount: number; completed: number;
} {
  const own = tasks.filter(t => t.project_id === project.id && !t.archived);
  const open = own.filter(t => t.status !== 'done');
  const overdue = open.filter(t => t.due_date && t.due_date < today).length;
  const blocked = open.filter(t => t.status === 'blocked').length;
  const daysLeft = project.deadline ? daysBetween(today, project.deadline) : Infinity;

  const reasons: string[] = [];
  if (blocked) reasons.push(`${blocked} blocked task${blocked === 1 ? '' : 's'}`);
  if (overdue) reasons.push(`${overdue} overdue task${overdue === 1 ? '' : 's'}`);
  if (daysLeft <= 14 && project.progress < 60) {
    reasons.push(`Deadline in ${Math.max(daysLeft, 0)} days at ${project.progress}%`);
  }
  if (project.status === 'at_risk' && !reasons.length) reasons.push('Marked at risk');

  const health: Health =
    blocked > 1 || overdue > 2 ? 'blocked' : reasons.length ? 'at_risk' : 'on_track';

  return { health, reasons, taskCount: own.length, completed: own.filter(t => t.status === 'done').length };
}

/**
 * Workload band. An operational indicator only - it says who is carrying pressure,
 * not who is productive.
 */
export function workloadLevel(counts: {
  active: number; high: number; due_week: number; overdue: number; blocked: number;
}): Level {
  const score =
    counts.active + counts.high * 0.75 + counts.due_week * 0.5 + counts.overdue + counts.blocked;
  if (score < 4) return 'low';
  if (score < 8) return 'normal';
  if (score < 12) return 'high';
  return 'overloaded';
}

export interface RawWorkspace {
  profiles: Profile[];
  projects: ProjectRow[];
  tasks: Task[];
  checklist: Checklist[];
  comments: Comment[];
  content: ContentItem[];
  platforms: Platform[];
  milestones: Milestone[];
  meetings: Meeting[];
  notes: Note[];
  activity: Activity[];
  notifications: Notification[];
  settings: Record<string, string>;
}

/** Folds raw rows into the shape every screen reads, computing all derived views. */
export function deriveWorkspace(raw: RawWorkspace, today = todayISO()): Workspace {
  const tasks = raw.tasks.filter(t => !t.archived);
  const staleDays = Number(raw.settings.stale_days ?? 5) || 5;
  const tomorrow = addDays(today, 1);
  const inTwoDays = addDays(today, 2);
  const weekAhead = addDays(today, 7);
  const weekBehind = addDays(today, -7);

  const projects: Project[] = raw.projects.map(p => ({
    ...p,
    ...projectHealth(p, tasks, today),
  }));

  const open = tasks.filter(t => t.status !== 'done');
  const attention: Attention = {
    overdue: open.filter(t => t.due_date && t.due_date < today),
    due_today: open.filter(t => t.due_date === today),
    due_tomorrow: open.filter(t => t.due_date === tomorrow),
    due_soon: open.filter(t => t.due_date && t.due_date >= today && t.due_date <= inTwoDays),
    blocked: open.filter(t => t.status === 'blocked'),
    review: open.filter(t => t.status === 'review'),
    follow_up: open.filter(t => t.follow_up_date && t.follow_up_date <= today),
    stale: open.filter(t => (Date.now() - new Date(t.updated_at).getTime()) / 86_400_000 >= staleDays),
    at_risk: projects.filter(p => p.health !== 'on_track'),
  };

  const workload: Workload[] = raw.profiles.map(person => {
    const mine = open.filter(t => t.assignee_id === person.id);
    const counts = {
      active: mine.length,
      high: mine.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
      due_week: mine.filter(t => t.due_date && t.due_date >= today && t.due_date <= weekAhead).length,
      overdue: mine.filter(t => t.due_date && t.due_date < today).length,
      blocked: mine.filter(t => t.status === 'blocked').length,
    };
    return { profile_id: person.id, ...counts, level: workloadLevel(counts) };
  });

  const weekly: Weekly = {
    completed: tasks.filter(t => t.status === 'done' && t.updated_at.slice(0, 10) >= weekBehind),
    overdue: attention.overdue,
    blocked: attention.blocked,
    upcoming: open.filter(t => t.due_date && t.due_date >= today && t.due_date <= weekAhead),
    published: raw.content.filter(c => c.stage === 'published' && c.publish_date && c.publish_date >= weekBehind),
    contentUpcoming: raw.content.filter(c => c.publish_date && c.publish_date >= today && c.publish_date <= weekAhead),
  };

  return {
    profiles: raw.profiles,
    projects,
    tasks,
    checklist: raw.checklist,
    comments: raw.comments,
    content: raw.content,
    platforms: raw.platforms,
    milestones: raw.milestones,
    meetings: raw.meetings,
    notes: raw.notes,
    activity: raw.activity,
    notifications: raw.notifications,
    settings: raw.settings,
    attention,
    workload,
    weekly,
    today,
  };
}
