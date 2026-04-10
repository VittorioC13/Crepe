"use client";

import { useEffect, useMemo, useState } from "react";
import { loadTasks, saveTasks } from "../lib/taskStore";
import {
  createTask,
  deleteTask,
  getTaskSection,
  reorderTasks,
  sortTasks,
  updateTask,
} from "../lib/tasks";
import type { Task, TaskDraft, TaskSection } from "../types/tasks";

export function useTaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTasks(sortTasks(loadTasks()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveTasks(tasks);
  }, [tasks, hydrated]);

  const grouped = useMemo(() => {
    const todo = tasks.filter((task) => getTaskSection(task) === "todo");
    const completed = tasks.filter((task) => getTaskSection(task) === "completed");
    return { todo, completed };
  }, [tasks]);

  return {
    tasks,
    grouped,
    hydrated,
    addTask(draft: TaskDraft) {
      setTasks((current) => {
        const todoCount = current.filter((task) => getTaskSection(task) === "todo").length;
        return sortTasks([...current, createTask(draft, todoCount)]);
      });
    },
    updateTask(taskId: string, patch: Partial<Task>) {
      setTasks((current) => sortTasks(updateTask(current, taskId, patch)));
    },
    deleteTask(taskId: string) {
      setTasks((current) => sortTasks(deleteTask(current, taskId)));
    },
    reorderTask(taskId: string, targetSection: TaskSection, targetIndex: number) {
      setTasks((current) => sortTasks(reorderTasks(current, taskId, targetSection, targetIndex)));
    },
  };
}
