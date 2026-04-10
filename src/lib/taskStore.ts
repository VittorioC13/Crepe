import { normalizeTasks, seedTasks } from "./tasks";
import type { Task } from "../types/tasks";

const STORAGE_KEY = "musashi.pm.tasks.v1";

export function loadTasks(): Task[] {
  if (typeof window === "undefined") {
    return seedTasks();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return seedTasks();
  }

  try {
    const parsed = JSON.parse(raw) as Task[];
    return normalizeTasks(Array.isArray(parsed) ? parsed : seedTasks());
  } catch {
    return seedTasks();
  }
}

export function saveTasks(tasks: Task[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTasks(tasks)));
}

export function clearTasks() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
