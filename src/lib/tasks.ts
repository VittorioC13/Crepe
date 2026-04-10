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
  const dueDate = draft.dueDate ?? draft.timelineEnd ?? null;
  const range =
    timelineStart && dueDate
      ? clampDateRange(timelineStart, dueDate)
      : { start: timelineStart, end: dueDate };

  const status = draft.status ?? DEFAULT_STATUS;

  return {
    id: createId(),
    title: draft.title ?? "",
    status,
    priority: draft.priority ?? DEFAULT_PRIORITY,
    dueDate: range.end ?? null,
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
        dueDate: addDays(today, 4),
        timelineStart: today,
      },
      0,
    ),
    createTask(
      {
        title: "Draft launch checklist",
        status: "stuck",
        priority: "medium",
        dueDate: addDays(today, 6),
        timelineStart: addDays(today, 1),
      },
      1,
    ),
    createTask(
      {
        title: "Prepare onboarding notes",
        status: "working",
        priority: "low",
        dueDate: addDays(today, 8),
        timelineStart: addDays(today, 3),
      },
      2,
    ),
    createTask(
      {
        title: "Archive previous sprint",
        status: "done",
        priority: "medium",
        dueDate: addDays(today, -2),
        timelineStart: addDays(today, -6),
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
      dueDate: task.dueDate ?? task.timelineEnd ?? null,
      timelineStart: task.timelineStart ?? null,
      timelineEnd: task.dueDate ?? task.timelineEnd ?? null,
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

    if (patch.dueDate !== undefined) {
      nextTask.timelineEnd = patch.dueDate;
    }

    if (status !== "done") {
      nextTask.lastActiveStatus = status;
    }

    if (nextTask.timelineStart && nextTask.dueDate) {
      const range = clampDateRange(nextTask.timelineStart, nextTask.dueDate);
      nextTask.timelineStart = range.start;
      nextTask.dueDate = range.end;
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
): Pick<Task, "timelineStart" | "timelineEnd" | "dueDate"> {
  if (!task.timelineStart || !task.dueDate) {
    return {
      timelineStart: task.timelineStart,
      dueDate: task.dueDate,
      timelineEnd: task.dueDate,
    };
  }

  return {
    timelineStart: addDays(task.timelineStart, deltaDays),
    dueDate: addDays(task.dueDate, deltaDays),
    timelineEnd: addDays(task.dueDate, deltaDays),
  };
}

export function resizeTimeline(
  task: Task,
  edge: "start" | "end",
  deltaDays: number,
): Pick<Task, "timelineStart" | "timelineEnd" | "dueDate"> {
  if (!task.timelineStart || !task.dueDate) {
    return {
      timelineStart: task.timelineStart,
      dueDate: task.dueDate,
      timelineEnd: task.dueDate,
    };
  }

  const start =
    edge === "start" ? addDays(task.timelineStart, deltaDays) : task.timelineStart;
  const end = edge === "end" ? addDays(task.dueDate, deltaDays) : task.dueDate;
  const range = clampDateRange(start, end);
  return {
    timelineStart: range.start,
    dueDate: range.end,
    timelineEnd: range.end,
  };
}

export function timelineDuration(task: Task) {
  if (!task.timelineStart || !task.dueDate) {
    return 0;
  }

  return diffDays(task.timelineStart, task.dueDate) + 1;
}
