import { addDays, clampDateRange, diffDays, todayIso } from "./date";
import type {
  Task,
  TaskDraft,
  TaskPriority,
  TaskSection,
  TaskStatus,
} from "../types/tasks";

const DEFAULT_STATUS: TaskStatus = "working";
const DEFAULT_PRIORITY: TaskPriority = "medium";
const DEFAULT_ACTIVE_STATUS: Exclude<TaskStatus, "done"> = "working";

function toLastActiveStatus(status: TaskStatus): Exclude<TaskStatus, "done"> {
  return status === "done" ? DEFAULT_ACTIVE_STATUS : status;
}

function createId() {
  return `task_${Math.random().toString(36).slice(2, 10)}`;
}

export function getTaskSection(task: Task): TaskSection {
  return task.status === "done" ? "completed" : "todo";
}

export function createTask(draft: TaskDraft, sortOrder: number): Task {
  const now = new Date().toISOString();
  const timelineStart = draft.timelineStart ?? null;
  const timelineEnd = draft.timelineEnd ?? null;
  const range =
    timelineStart && timelineEnd
      ? clampDateRange(timelineStart, timelineEnd)
      : { start: timelineStart, end: timelineEnd };

  const status = draft.status ?? DEFAULT_STATUS;

  return {
    id: createId(),
    title: draft.title ?? "",
    status,
    priority: draft.priority ?? DEFAULT_PRIORITY,
    dueDate: draft.dueDate ?? null,
    timelineStart: range.start ?? null,
    timelineEnd: range.end ?? null,
    lastActiveStatus: toLastActiveStatus(status),
    createdAt: now,
    updatedAt: now,
    sortOrder,
  };
}

export function seedTasks(): Task[] {
  const today = todayIso();
  return [
    createTask(
      {
        title: "Align product goals",
        status: "working",
        priority: "high",
        dueDate: addDays(today, 2),
        timelineStart: today,
        timelineEnd: addDays(today, 4),
      },
      0,
    ),
    createTask(
      {
        title: "Draft launch checklist",
        status: "stuck",
        priority: "medium",
        dueDate: addDays(today, 5),
        timelineStart: addDays(today, 1),
        timelineEnd: addDays(today, 6),
      },
      1,
    ),
    createTask(
      {
        title: "Prepare onboarding notes",
        status: "working",
        priority: "low",
        dueDate: addDays(today, 7),
        timelineStart: addDays(today, 3),
        timelineEnd: addDays(today, 8),
      },
      2,
    ),
    createTask(
      {
        title: "Archive previous sprint",
        status: "done",
        priority: "medium",
        dueDate: addDays(today, -1),
        timelineStart: addDays(today, -6),
        timelineEnd: addDays(today, -2),
      },
      0,
    ),
  ];
}

export function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const sectionDelta =
      (getTaskSection(left) === "completed" ? 1 : 0) -
      (getTaskSection(right) === "completed" ? 1 : 0);

    if (sectionDelta !== 0) {
      return sectionDelta;
    }

    return left.sortOrder - right.sortOrder;
  });
}

export function normalizeTasks(tasks: Task[]) {
  const bySection: Record<TaskSection, Task[]> = {
    todo: [],
    completed: [],
  };

  tasks.forEach((task) => {
    const status =
      task.status === "working" || task.status === "done" || task.status === "stuck"
        ? task.status
        : DEFAULT_STATUS;
    const priority =
      task.priority === "low" || task.priority === "medium" || task.priority === "high"
        ? task.priority
        : DEFAULT_PRIORITY;
    const lastActiveStatus =
      task.lastActiveStatus === "working" || task.lastActiveStatus === "stuck"
        ? task.lastActiveStatus
        : toLastActiveStatus(status);

    bySection[getTaskSection({ ...task, status })].push({
      ...task,
      status,
      priority,
      title: task.title ?? "",
      dueDate: task.dueDate ?? null,
      timelineStart: task.timelineStart ?? null,
      timelineEnd: task.timelineEnd ?? null,
      lastActiveStatus,
    });
  });

  return (["todo", "completed"] as const).flatMap((section) =>
    bySection[section]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((task, index) => ({ ...task, sortOrder: index })),
  );
}

export function reorderTasks(
  tasks: Task[],
  taskId: string,
  targetSection: TaskSection,
  targetIndex: number,
) {
  const current = tasks.find((task) => task.id === taskId);
  if (!current) {
    return tasks;
  }

  const remaining = tasks.filter((task) => task.id !== taskId);
  const nextStatus =
    targetSection === "completed"
      ? "done"
      : current.status === "done"
        ? current.lastActiveStatus ?? DEFAULT_STATUS
        : current.status;

  const moved: Task = {
    ...current,
    status: nextStatus,
    lastActiveStatus:
      nextStatus === "done"
        ? current.lastActiveStatus
        : (nextStatus as Exclude<TaskStatus, "done">),
    updatedAt: new Date().toISOString(),
  };

  const nextBySection: Record<TaskSection, Task[]> = { todo: [], completed: [] };

  remaining.forEach((task) => {
    nextBySection[getTaskSection(task)].push(task);
  });

  const safeIndex = Math.max(0, Math.min(targetIndex, nextBySection[targetSection].length));
  nextBySection[targetSection].splice(safeIndex, 0, moved);

  return (["todo", "completed"] as const).flatMap((section) =>
    nextBySection[section].map((task, index) => ({ ...task, sortOrder: index })),
  );
}

export function updateTask(tasks: Task[], taskId: string, patch: Partial<Task>) {
  const next = tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    const status = (patch.status ?? task.status) as TaskStatus;
    const nextTask: Task = {
      ...task,
      ...patch,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status !== "done") {
      nextTask.lastActiveStatus = status;
    }

    if (nextTask.timelineStart && nextTask.timelineEnd) {
      const range = clampDateRange(nextTask.timelineStart, nextTask.timelineEnd);
      nextTask.timelineStart = range.start;
      nextTask.timelineEnd = range.end;
    }

    return nextTask;
  });

  return normalizeTasks(next);
}

export function deleteTask(tasks: Task[], taskId: string) {
  return normalizeTasks(tasks.filter((task) => task.id !== taskId));
}

export function moveTimeline(
  task: Task,
  deltaDays: number,
): Pick<Task, "timelineStart" | "timelineEnd"> {
  if (!task.timelineStart || !task.timelineEnd) {
    return {
      timelineStart: task.timelineStart,
      timelineEnd: task.timelineEnd,
    };
  }

  return {
    timelineStart: addDays(task.timelineStart, deltaDays),
    timelineEnd: addDays(task.timelineEnd, deltaDays),
  };
}

export function resizeTimeline(
  task: Task,
  edge: "start" | "end",
  deltaDays: number,
): Pick<Task, "timelineStart" | "timelineEnd"> {
  if (!task.timelineStart || !task.timelineEnd) {
    return {
      timelineStart: task.timelineStart,
      timelineEnd: task.timelineEnd,
    };
  }

  const start =
    edge === "start" ? addDays(task.timelineStart, deltaDays) : task.timelineStart;
  const end = edge === "end" ? addDays(task.timelineEnd, deltaDays) : task.timelineEnd;
  const range = clampDateRange(start, end);
  return {
    timelineStart: range.start,
    timelineEnd: range.end,
  };
}

export function timelineDuration(task: Task) {
  if (!task.timelineStart || !task.timelineEnd) {
    return 0;
  }

  return diffDays(task.timelineStart, task.timelineEnd) + 1;
}
