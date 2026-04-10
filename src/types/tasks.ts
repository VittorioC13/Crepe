export type TaskStatus = "working" | "done" | "stuck";

export type TaskPriority = "low" | "medium" | "high";

export type TaskSection = "todo" | "completed";

export type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  timelineStart: string | null;
  timelineEnd: string | null;
  lastActiveStatus?: Exclude<TaskStatus, "done">;
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
};

export type TaskDraft = {
  title: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  timelineStart?: string | null;
  timelineEnd?: string | null;
};
