-- ============================================================
-- Shadow Security COO OS - demo data
-- Run this AFTER schema.sql. Safe to re-run: it clears and reloads
-- the demo data, so this doubles as your "Reset demo data" button.
-- Dates are relative to the day you run it, so the demo always looks current.
-- ============================================================

truncate table checklist_items, comments, notifications, activity, milestones,
               meeting_notes, notes, content_items, tasks, projects, platforms,
               profiles, settings restart identity cascade;

-- ---------- People (invite-gated: signup only works for these emails) ----------
-- Replace the placeholder emails below with real ones before inviting people.
-- Arya and Samarth are admins; everyone else is a member.

insert into profiles (id, name, role, access_role, department, email) values
  ('arya',    'Arya',    'COO',        'admin',  'Operations', 'arya@shadowsecurity.in'),
  ('samarth', 'Samarth', 'Co-founder', 'admin',  'Operations', 'samarth@shadowsecurity.in'),
  ('team-01', 'Team Member 01', 'Product Engineer',      'member', 'Product',            'team01@shadowsecurity.in'),
  ('team-02', 'Team Member 02', 'Security Researcher',   'member', 'Security',           'team02@shadowsecurity.in'),
  ('team-03', 'Team Member 03', 'Frontend Engineer',     'member', 'Engineering',        'team03@shadowsecurity.in'),
  ('team-04', 'Team Member 04', 'Content Strategist',    'member', 'Content',            'team04@shadowsecurity.in'),
  ('team-05', 'Team Member 05', 'Backend Engineer',      'member', 'Engineering',        'team05@shadowsecurity.in'),
  ('team-06', 'Team Member 06', 'Security Analyst',      'member', 'Security',           'team06@shadowsecurity.in'),
  ('team-07', 'Team Member 07', 'Product Designer',      'member', 'Design',             'team07@shadowsecurity.in'),
  ('team-08', 'Team Member 08', 'Technical Writer',      'member', 'Content',            'team08@shadowsecurity.in'),
  ('team-09', 'Team Member 09', 'Growth Associate',      'member', 'Growth',             'team09@shadowsecurity.in'),
  ('team-10', 'Team Member 10', 'QA Engineer',           'member', 'Engineering',        'team10@shadowsecurity.in'),
  ('team-11', 'Team Member 11', 'Community Lead',        'member', 'Community',          'team11@shadowsecurity.in'),
  ('team-12', 'Team Member 12', 'Compliance Researcher', 'member', 'Compliance',         'team12@shadowsecurity.in'),
  ('team-13', 'Team Member 13', 'Video Editor',          'member', 'Content',            'team13@shadowsecurity.in'),
  ('team-14', 'Team Member 14', 'Developer Advocate',    'member', 'Developer Relations','team14@shadowsecurity.in'),
  ('team-15', 'Team Member 15', 'Operations Associate',  'member', 'Operations',         'team15@shadowsecurity.in');

-- ---------- Projects (Shastra protected as the primary product) ----------

insert into projects (id, name, description, owner_id, team, status, deadline, progress) values
  ('shastra-runtime',  'Shastra Governance Runtime',      'Deterministic DPDP policy enforcement, evidence, and developer integration.', 'team-01', array['arya','team-01','team-03','team-05','team-10','team-12'], 'active',   current_date + 52, 64),
  ('shastra-copilot',  'Shastra Compliance Copilot',      'Human-facing compliance workspace, kept outside enforcement paths.',          'team-03', array['arya','team-03','team-07','team-12'],                     'active',   current_date + 41, 48),
  ('suraksha-labs',    'Suraksha Labs Early Access',      'Lightweight investigation labs and researcher community foundation.',        'team-02', array['arya','team-02','team-06','team-11','team-14'],            'active',   current_date + 67, 37),
  ('vdp-foundation',   'Suraksha VDP Foundation',         'Simple disclosure workflow and researcher acknowledgement for v1.',          'team-06', array['arya','team-02','team-06','team-09'],                      'planning', current_date + 94, 18),
  ('content-engine',   'Shadow Security Content Engine',  'Editorial system for product education and cybersecurity publishing.',       'team-04', array['arya','team-04','team-08','team-09','team-13'],            'active',   current_date + 30, 57),
  ('website-brand',    'Website & Brand Clarity',         'Accurate public product status, messaging, and launch readiness.',            'arya',    array['arya','team-07','team-08'],                                'at_risk',  current_date + 14, 46);

-- ---------- Tasks (42: overdue, today, upcoming, blocked, review, done) ----------

insert into tasks (id, title, description, assignee_id, project_id, status, priority, due_date, start_date, follow_up_date, blocked_reason, position, updated_at) values
  ('task-01','Finalize Shastra policy evaluation contract','Lock the evaluation contract so enforcement stays deterministic.','team-01','shastra-runtime','blocked','urgent',current_date - 2,current_date - 12,current_date,'Waiting for final policy-owner decision.',1, now() - interval '3 days'),
  ('task-02','Document consent enforcement API','','team-02','shastra-runtime','in_progress','high',current_date - 1,current_date - 9,null,null,2, now() - interval '1 day'),
  ('task-03','Benchmark consent decision latency','Target is under 2ms end to end.','team-03','shastra-runtime','review','medium',current_date,current_date - 8,null,null,3, now() - interval '6 hours'),
  ('task-04','Review proof ledger event schema','','team-04','shastra-copilot','todo','medium',current_date + 1,current_date - 5,null,null,4, now() - interval '2 days'),
  ('task-05','Build SDK integration example','Reference integration a customer engineer can copy.','team-05','shastra-runtime','in_progress','high',current_date + 2,current_date - 4,current_date,null,5, now() - interval '1 day'),
  ('task-06','Write data-principal request workflow','','team-06','shastra-copilot','todo','medium',current_date + 3,current_date - 2,null,null,6, now() - interval '4 days'),
  ('task-07','Map DPDP obligations to runtime controls','','team-12','shastra-runtime','in_progress','urgent',current_date + 4,current_date - 6,null,null,7, now() - interval '2 days'),
  ('task-08','Create enforcement failure runbook','','team-08','shastra-runtime','blocked','high',current_date - 3,current_date - 14,current_date - 1,'API credentials and test tenant are not available.',8, now() - interval '6 days'),
  ('task-09','Review database migration strategy','','team-09','shastra-runtime','todo','low',current_date + 6,current_date - 1,null,null,9, now() - interval '5 days'),
  ('task-10','Test audit export integrity','','team-10','shastra-runtime','done','medium',current_date - 4,current_date - 11,null,null,10, now() - interval '2 days'),
  ('task-11','Define Compliance Copilot boundaries','LLM use stays confined to the Copilot, never enforcement.','team-11','shastra-copilot','in_progress','high',current_date + 7,current_date - 3,null,null,11, now() - interval '1 day'),
  ('task-12','Draft compliance workspace navigation','','team-12','shastra-copilot','todo','medium',current_date + 8,current_date,null,null,12, now() - interval '7 days'),
  ('task-13','Review legal-validation disclaimers','Capability vs legal validation must read clearly.','team-13','shastra-copilot','review','urgent',current_date + 2,current_date - 5,current_date,null,13, now() - interval '1 day'),
  ('task-14','Create assessment evidence checklist','','team-14','shastra-copilot','todo','medium',current_date + 9,current_date + 1,null,null,14, now() - interval '3 days'),
  ('task-15','Test policy explanation output','','team-15','shastra-copilot','in_progress','low',current_date + 5,current_date - 2,null,null,15, now() - interval '2 days'),
  ('task-16','Design Suraksha investigation mission','','team-01','suraksha-labs','in_progress','medium',current_date + 11,current_date - 4,null,null,16, now() - interval '1 day'),
  ('task-17','Prepare Linux forensics lab','','team-02','suraksha-labs','todo','low',current_date + 12,current_date + 2,null,null,17, now() - interval '8 days'),
  ('task-18','Review researcher onboarding copy','','team-03','suraksha-labs','review','medium',current_date + 3,current_date - 3,null,null,18, now() - interval '2 days'),
  ('task-19','Build lightweight leaderboard','Simple leaderboard only - not a full bounty platform for v1.','team-04','suraksha-labs','todo','low',current_date + 15,current_date + 4,null,null,19, now() - interval '6 days'),
  ('task-20','Plan community office hours','','team-05','suraksha-labs','backlog','low',current_date + 18,null,null,null,20, now() - interval '9 days'),
  ('task-21','Define VDP report intake fields','','team-06','vdp-foundation','todo','medium',current_date + 14,current_date + 1,current_date,null,21, now() - interval '3 days'),
  ('task-22','Draft vulnerability triage workflow','','team-07','vdp-foundation','backlog','medium',current_date + 21,null,null,null,22, now() - interval '5 days'),
  ('task-23','Create researcher acknowledgement template','','team-08','vdp-foundation','backlog','low',current_date + 24,null,null,null,23, now() - interval '10 days'),
  ('task-24','Review responsible disclosure policy','','team-09','vdp-foundation','todo','high',current_date + 10,current_date,null,null,24, now() - interval '1 day'),
  ('task-25','Prepare DPDP article outline','Lead with real-time enforcement, not the ledger.','team-08','content-engine','review','high',current_date,current_date - 6,current_date,null,25, now() - interval '5 hours'),
  ('task-26','Write LinkedIn enforcement post','','team-04','content-engine','in_progress','medium',current_date + 1,current_date - 2,null,null,26, now() - interval '1 day'),
  ('task-27','Design Instagram security carousel','','team-07','content-engine','todo','medium',current_date + 4,current_date,null,null,27, now() - interval '2 days'),
  ('task-28','Edit YouTube product walkthrough','','team-13','content-engine','in_progress','high',current_date + 5,current_date - 3,null,null,28, now() - interval '1 day'),
  ('task-29','Review monthly editorial calendar','','team-09','content-engine','todo','low',current_date + 8,current_date + 1,null,null,29, now() - interval '4 days'),
  ('task-30','Schedule newsletter issue','','team-15','content-engine','done','medium',current_date - 5,current_date - 10,null,null,30, now() - interval '3 days'),
  ('task-31','Rewrite Shastra product status page','Say plainly what is built and what is planned.','arya','website-brand','in_progress','urgent',current_date - 1,current_date - 7,current_date,null,31, now() - interval '1 day'),
  ('task-32','Audit public claims for accuracy','','team-12','website-brand','review','urgent',current_date + 1,current_date - 4,current_date,null,32, now() - interval '2 days'),
  ('task-33','Prepare founder update deck','','arya','website-brand','todo','high',current_date + 6,current_date,null,null,33, now() - interval '3 days'),
  ('task-34','Create weekly operations review','','team-15','website-brand','done','medium',current_date - 6,current_date - 12,null,null,34, now() - interval '4 days'),
  ('task-35','Research managed PostgreSQL options','','team-05','shastra-runtime','done','low',current_date - 7,current_date - 13,null,null,35, now() - interval '5 days'),
  ('task-36','Document cloud deployment checklist','','team-10','shastra-runtime','todo','medium',current_date + 13,current_date + 2,null,null,36, now() - interval '7 days'),
  ('task-37','Review accessibility across product pages','','team-07','website-brand','blocked','medium',current_date + 2,current_date - 1,null,'Waiting on final design tokens from the brand review.',37, now() - interval '4 days'),
  ('task-38','Prepare demo environment checklist','','team-14','shastra-copilot','todo','high',current_date + 3,current_date,current_date,null,38, now() - interval '2 days'),
  ('task-39','Triage launch-readiness blockers','','arya','website-brand','in_progress','urgent',current_date,current_date - 2,null,null,39, now() - interval '3 hours'),
  ('task-40','Update product roadmap dependencies','','team-01','shastra-runtime','todo','medium',current_date + 16,current_date + 3,null,null,40, now() - interval '8 days'),
  ('task-41','Review customer discovery notes','','team-09','content-engine','backlog','low',current_date + 20,null,null,null,41, now() - interval '11 days'),
  ('task-42','Prepare September operating priorities','Protect Shastra delivery first.','arya','shastra-runtime','review','high',current_date + 2,current_date - 5,current_date,null,42, now() - interval '1 day');

-- ---------- Checklists ----------

insert into checklist_items (id, task_id, text, completed, position) values
  ('check-01','task-25','Research',           true, 1),
  ('check-02','task-25','Draft',              true, 2),
  ('check-03','task-25','Technical review',  false, 3),
  ('check-04','task-25','COO approval',      false, 4),
  ('check-05','task-25','Publish',           false, 5),
  ('check-06','task-02','API contract',       true, 1),
  ('check-07','task-02','SDK example',       false, 2),
  ('check-08','task-02','Error handling',    false, 3),
  ('check-09','task-02','Performance test',  false, 4),
  ('check-10','task-31','Audit current copy', true, 1),
  ('check-11','task-31','Rewrite status table',false,2),
  ('check-12','task-31','Legal-safe review', false, 3);

-- ---------- Comments ----------

insert into comments (id, task_id, profile_id, body, created_at) values
  ('comment-1','task-01','team-12','The obligation mapping is ready; waiting for the enforcement decision.', now() - interval '4 hours'),
  ('comment-2','task-25','team-08','First draft is ready for technical review.',                              now() - interval '2 hours'),
  ('comment-3','task-08','team-08','Still blocked - no test tenant. Can we escalate?',                        now() - interval '1 day'),
  ('comment-4','task-31','arya',   'Keep the wording precise: capability is not legal validation.',           now() - interval '5 hours');

-- ---------- Content platforms ----------

insert into platforms (id, name) values
  ('instagram','Instagram'),
  ('linkedin','LinkedIn'),
  ('x','X'),
  ('youtube','YouTube'),
  ('website','Website / Blog'),
  ('newsletter','Newsletter'),
  ('other','Other');

-- ---------- Content pipeline ----------

insert into content_items (id, title, platform_id, content_type, owner_id, writer_id, designer_id, reviewer_id, campaign, publish_date, stage, approval_status, brief, published_url, views, reach, likes, comments_count, shares, saves, position) values
  ('content-01','Real-time DPDP enforcement explained','linkedin','Article','team-04','team-08','team-07','arya','Shastra Education',   current_date + 2,'writing',  'in_review',        'Explain runtime enforcement plainly, no legal overclaiming.','',0,0,0,0,0,0,1),
  ('content-02','Why evidence should be produced during governance','website','Article','team-08','team-12','team-07','arya','Shastra Education', current_date + 5,'research', 'draft',            'Evidence as a by-product of governance, not a later report.','',0,0,0,0,0,0,2),
  ('content-03','Inside a Suraksha investigation mission','youtube','Video','team-13','team-02','team-13','team-11','Community',            current_date + 8,'design',   'changes_requested','Show the mission format without solving it for viewers.','',0,0,0,0,0,0,3),
  ('content-04','DPDP readiness without legal overclaiming','linkedin','Article','team-04','team-12','team-07','arya','Trust Through Clarity', current_date + 3,'review',   'in_review',        'Distinguish product capability from legal validation.','',0,0,0,0,0,0,4),
  ('content-05','Researcher disclosure: a practical guide','website','Article','team-06','team-08','team-07','team-02','Community',           current_date + 12,'planned', 'draft',            'Practical disclosure walkthrough for researchers.','',0,0,0,0,0,0,5),
  ('content-06','Shastra SDK integration walkthrough','youtube','Video','team-14','team-05','team-13','team-01','Shastra Education',          current_date + 15,'idea',    'draft',            'Developer-facing integration walkthrough.','',0,0,0,0,0,0,6),
  ('content-07','Security careers beyond the hacker stereotype','instagram','Carousel','team-11','team-04','team-07','arya','Community',      current_date + 1,'approved', 'approved',         'Address the stigma directly, no patriotic framing.','',0,0,0,0,0,0,7),
  ('content-08','Weekly cybersecurity signals','x','Thread','team-09','team-06','team-07','team-04','Community',                             current_date,'scheduled','scheduled',        'Weekly signal roundup, factual tone.','',0,0,0,0,0,0,8),
  ('content-09','Founder note: building with restraint','linkedin','Article','arya','arya','team-07','team-04','Trust Through Clarity',       current_date - 3,'published','published',        'Why we publish honest product status.','https://shadowsecurity.in',2480,1910,142,21,26,34,9),
  ('content-10','Consent latency benchmark visual','instagram','Carousel','team-07','team-03','team-07','team-01','Shastra Education',        current_date + 6,'design',  'draft',            'Visualise the sub-2ms enforcement target.','',0,0,0,0,0,0,10),
  ('content-11','Compliance Copilot boundaries','website','Article','team-12','team-12','team-07','arya','Shastra Education',                 current_date + 9,'writing', 'in_review',        'Where LLMs are and are not used in the product.','',0,0,0,0,0,0,11),
  ('content-12','Suraksha Labs early-access update','newsletter','Article','team-11','team-08','team-07','team-02','Community',               current_date + 4,'review',  'in_review',        'Honest status update on early access.','',0,0,0,0,0,0,12),
  ('content-13','Responsible disclosure checklist','website','Article','team-06','team-06','team-07','team-02','Community',                   current_date + 18,'idea',   'draft',            'One-page checklist for reporters.','',0,0,0,0,0,0,13),
  ('content-14','September product progress','newsletter','Article','arya','team-08','team-07','arya','Trust Through Clarity',                current_date + 20,'planned','draft',            'What shipped, what did not, what is next.','',0,0,0,0,0,0,14),
  ('content-15','How runtime enforcement works','youtube','Video','team-14','team-01','team-13','team-03','Shastra Education',                current_date + 11,'research','draft',            'Technical explainer for engineers.','',0,0,0,0,0,0,15),
  ('content-16','Community office-hours announcement','x','Thread','team-11','team-11','team-07','team-04','Community',                       current_date + 7,'approved','approved',         'Announce the first office hours session.','',0,0,0,0,0,0,16),
  ('content-17','Product status: what is built and what is planned','website','Article','arya','team-08','team-07','arya','Trust Through Clarity', current_date - 6,'published','published',    'Public, accurate build status per product.','https://shadowsecurity.in',3120,2405,168,29,38,45,17),
  ('content-18','Monthly Shadow Security briefing','newsletter','Article','team-09','team-04','team-07','arya','Community',                   current_date + 24,'idea',   'draft',            'Monthly roundup for subscribers.','',0,0,0,0,0,0,18);

-- ---------- Milestones ----------

insert into milestones (id, project_id, title, due_date, completed) values
  ('mile-1','shastra-runtime','SDK integration candidate',     current_date + 21, false),
  ('mile-2','shastra-runtime','Runtime beta readiness review', current_date + 48, false),
  ('mile-3','content-engine', 'September editorial package',    current_date + 12, false),
  ('mile-4','suraksha-labs',  'First three labs ready',         current_date + 40, false),
  ('mile-5','website-brand',  'Public status page accurate',    current_date + 10, false);

-- ---------- Meeting notes ----------

insert into meeting_notes (id, title, meeting_date, participants, notes, decisions, action_items, created_by) values
  ('meeting-1','Weekly product and operations review', current_date - 2,
   array['arya','team-01','team-03','team-04'],
   'Reviewed Shastra runtime delivery, content approvals, and current blockers.',
   'Protect deterministic enforcement scope. Keep Suraksha Labs lightweight for v1.',
   '[{"text":"Complete SDK documentation by Friday","done":false},{"text":"Review DPDP article claims","done":true},{"text":"Escalate the missing test tenant","done":false}]'::jsonb,
   'arya'),
  ('meeting-2','Content and brand clarity sync', current_date - 5,
   array['arya','team-04','team-07','team-08'],
   'Went through public claims and the product status page wording.',
   'Lead with real-time enforcement. Do not lead with the cryptographic ledger.',
   '[{"text":"Rewrite the Shastra status table","done":false},{"text":"Add explicit planned vs built labels","done":true}]'::jsonb,
   'arya');

-- ---------- Notes ----------

insert into notes (id, title, body, created_by, pinned) values
  ('note-1','COO operating principles','Protect Shastra delivery. Escalate blockers early. Keep product claims precise and evidence-based.','arya', true),
  ('note-2','September focus','Runtime enforcement, SDK documentation, editorial consistency, and weekly follow-up discipline.','arya', false),
  ('note-3','Deployment reminder','Put access protection in front of the workspace before sharing the link with the whole team.','arya', false);

-- ---------- Activity ----------

insert into activity (id, profile_id, action, entity_type, entity_id, created_at) values
  ('act-1','arya',   'created the shared COO workspace',                        'workspace','workspace', now() - interval '9 days'),
  ('act-2','team-04','moved "Prepare DPDP article outline" to Review',          'task','task-25',        now() - interval '5 hours'),
  ('act-3','team-01','marked "Finalize Shastra policy evaluation contract" as Blocked','task','task-01', now() - interval '3 days'),
  ('act-4','team-10','completed "Test audit export integrity"',                 'task','task-10',        now() - interval '2 days'),
  ('act-5','arya',   'assigned "Audit public claims for accuracy" to Team Member 12','task','task-32',   now() - interval '2 days'),
  ('act-6','team-08','commented on a task',                                     'task','task-08',        now() - interval '1 day'),
  ('act-7','team-13','moved "Inside a Suraksha investigation mission" to Design','content','content-03', now() - interval '1 day'),
  ('act-8','arya',   'published "Founder note: building with restraint"',        'content','content-09',  now() - interval '3 days');

-- ---------- Notifications ----------

insert into notifications (id, profile_id, message, created_at) values
  ('notif-1','arya',   '2 follow-ups need attention today.',        now() - interval '2 hours'),
  ('notif-2','arya',   '3 tasks are overdue across the team.',      now() - interval '1 hour'),
  ('notif-3','team-03','A Shastra task is due tomorrow.',           now() - interval '4 hours'),
  ('notif-4','team-08','Your task was moved to Review.',            now() - interval '5 hours');

-- ---------- Settings ----------

insert into settings (key, value) values
  ('stale_days','5'),
  ('workspace_name','Shadow Security COO OS'),
  ('schema_version','2');