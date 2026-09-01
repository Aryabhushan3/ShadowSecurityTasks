export type Status = 'backlog' | 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type Health = 'on_track' | 'at_risk' | 'blocked';
export type Level = 'low' | 'normal' | 'high' | 'overloaded';

export interface Profile { id: string; user_id: string | null; name: string; role: string; access_role: 'admin' | 'member'; department: string; email: string; active: boolean }
export interface ProjectRow { id: string; name: string; description: string; owner_id: string | null; team: string[]; status: string; deadline: string | null; progress: number }
export interface Project extends ProjectRow { health: Health; reasons: string[]; taskCount: number; completed: number }
export interface Task { id: string; title: string; description: string; assignee_id: string | null; project_id: string | null; status: Status; priority: Priority; due_date: string | null; start_date: string | null; follow_up_date: string | null; blocked_reason: string | null; archived: boolean; position: number; updated_at: string }
export interface Checklist { id: string; task_id: string; text: string; completed: boolean; position: number }
export interface Comment { id: string; task_id: string; profile_id: string | null; body: string; created_at: string }
export interface Platform { id: string; name: string; active: boolean }
export interface ContentItem { id: string; title: string; platform_id: string | null; content_type: string; owner_id: string | null; writer_id: string | null; designer_id: string | null; reviewer_id: string | null; campaign: string; publish_date: string | null; stage: string; approval_status: string; brief: string; caption: string; asset: string; published_url: string; notes: string; views: number; reach: number; likes: number; comments_count: number; shares: number; saves: number; position: number }
export interface Milestone { id: string; project_id: string; title: string; due_date: string | null; completed: boolean }
export interface ActionItem { text: string; done: boolean }
export interface Meeting { id: string; title: string; meeting_date: string; participants: string[]; notes: string; decisions: string; action_items: ActionItem[]; created_by: string | null }
export interface Note { id: string; title: string; body: string; created_by: string | null; pinned: boolean; updated_at: string }
export interface Activity { id: string; profile_id: string | null; action: string; entity_type: string; entity_id: string | null; created_at: string; profile_name?: string }
export interface Notification { id: string; profile_id: string; message: string; read: boolean; created_at: string }
export interface Workload { profile_id: string; active: number; high: number; due_week: number; overdue: number; blocked: number; level: Level }

export interface Attention {
  overdue: Task[]; due_today: Task[]; due_tomorrow: Task[]; due_soon: Task[];
  blocked: Task[]; review: Task[]; follow_up: Task[]; stale: Task[]; at_risk: Project[];
}

export interface Weekly {
  completed: Task[]; overdue: Task[]; blocked: Task[]; upcoming: Task[];
  published: ContentItem[]; contentUpcoming: ContentItem[];
}

export interface Workspace {
  profiles: Profile[];
  projects: Project[];
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
  attention: Attention;
  workload: Workload[];
  weekly: Weekly;
  today: string;
}
