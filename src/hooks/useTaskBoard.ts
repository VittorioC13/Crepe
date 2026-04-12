"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { loadTasks, saveTasks } from "../lib/taskStore";
import {
  createTask,
  deleteTask,
  getTaskSection,
  reorderTasks,
  sortTasks,
  updateTask,
} from "../lib/tasks";
import { isSupabaseConfigured } from "../lib/supabase/config";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import type { Task, TaskDraft, TaskSection } from "../types/tasks";

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  status: Task["status"];
  priority: Task["priority"];
  due_date: string | null;
  timeline_start: string | null;
  sort_order: number;
  last_active_status: Exclude<Task["status"], "done"> | null;
  created_at: string;
  updated_at: string;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    timelineStart: row.timeline_start,
    timelineEnd: row.due_date,
    sortOrder: row.sort_order,
    lastActiveStatus: row.last_active_status ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskToRow(task: Task, userId: string): Omit<TaskRow, "created_at" | "updated_at"> {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate,
    timeline_start: task.timelineStart,
    sort_order: task.sortOrder,
    last_active_status: task.lastActiveStatus ?? null,
  };
}

export function useTaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const authEnabled = isSupabaseConfigured();
  const supabase = authEnabled ? getSupabaseBrowserClient() : null;

  useEffect(() => {
    if (!authEnabled || !supabase) {
      setTasks(sortTasks(loadTasks()));
      setHydrated(true);
      return;
    }

    let active = true;
    const loadForSession = async (currentSession: Session | null) => {
      if (!active) {
        return;
      }

      setSession(currentSession);
      if (!currentSession) {
        setTasks([]);
        setHydrated(true);
        return;
      }

      const userId = currentSession.user.id;
      await supabase.from("profiles").upsert(
        {
          user_id: userId,
          email: currentSession.user.email ?? "unknown@user",
          full_name:
            (currentSession.user.user_metadata?.full_name as string | undefined) ?? null,
          avatar_url:
            (currentSession.user.user_metadata?.avatar_url as string | undefined) ?? null,
          last_sign_in_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      const { data } = await supabase
        .from("tasks")
        .select(
          "id,user_id,title,status,priority,due_date,timeline_start,sort_order,last_active_status,created_at,updated_at",
        )
        .order("sort_order", { ascending: true });

      if (!active) {
        return;
      }

      setTasks(sortTasks((data ?? []).map((row) => rowToTask(row as TaskRow))));
      setHydrated(true);
    };

    supabase.auth.getSession().then(({ data }) => loadForSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      loadForSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [authEnabled, supabase]);

  useEffect(() => {
    if (authEnabled) {
      return;
    }
    setTasks(sortTasks(loadTasks()));
    setHydrated(true);
  }, [authEnabled]);

  useEffect(() => {
    if (!hydrated || authEnabled) {
      return;
    }
    saveTasks(tasks);
  }, [tasks, hydrated, authEnabled]);

  const grouped = useMemo(() => {
    const todo = tasks.filter((task) => getTaskSection(task) === "todo");
    const completed = tasks.filter((task) => getTaskSection(task) === "completed");
    return { todo, completed };
  }, [tasks]);

  return {
    tasks,
    grouped,
    hydrated,
    session,
    user: session?.user ?? null,
    authEnabled,
    async signInWithGoogle() {
      if (!supabase) {
        return;
      }
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
    },
    async signOut() {
      if (!supabase) {
        return;
      }
      await supabase.auth.signOut();
    },
    addTask(draft: TaskDraft) {
      setTasks((current) => {
        const todoCount = current.filter((task) => getTaskSection(task) === "todo").length;
        const nextTask = createTask(draft, todoCount);

        if (authEnabled && supabase && session?.user) {
          const userId = session.user.id;
          void supabase
            .from("tasks")
            .insert({
              user_id: userId,
              title: nextTask.title,
              status: nextTask.status,
              priority: nextTask.priority,
              due_date: nextTask.dueDate,
              timeline_start: nextTask.timelineStart,
              sort_order: nextTask.sortOrder,
              last_active_status: nextTask.lastActiveStatus ?? null,
            })
            .select(
              "id,user_id,title,status,priority,due_date,timeline_start,sort_order,last_active_status,created_at,updated_at",
            )
            .single()
            .then(({ data }) => {
              if (!data) {
                return;
              }
              setTasks((latest) => {
                return sortTasks([...latest, rowToTask(data as TaskRow)]);
              });
            });

          return current;
        }

        return sortTasks([...current, nextTask]);
      });
    },
    updateTask(taskId: string, patch: Partial<Task>) {
      setTasks((current) => {
        const next = sortTasks(updateTask(current, taskId, patch));
        const changed = next.find((task) => task.id === taskId);

        if (authEnabled && supabase && session?.user && changed) {
          void supabase
            .from("tasks")
            .update({
              title: changed.title,
              status: changed.status,
              priority: changed.priority,
              due_date: changed.dueDate,
              timeline_start: changed.timelineStart,
              sort_order: changed.sortOrder,
              last_active_status: changed.lastActiveStatus ?? null,
            })
            .eq("id", changed.id)
            .eq("user_id", session.user.id);
        }

        return next;
      });
    },
    deleteTask(taskId: string) {
      setTasks((current) => {
        const next = sortTasks(deleteTask(current, taskId));
        if (authEnabled && supabase && session?.user) {
          void supabase.from("tasks").delete().eq("id", taskId).eq("user_id", session.user.id);
        }
        return next;
      });
    },
    reorderTask(taskId: string, targetSection: TaskSection, targetIndex: number) {
      setTasks((current) => {
        const next = sortTasks(reorderTasks(current, taskId, targetSection, targetIndex));

        if (authEnabled && supabase && session?.user) {
          void supabase
            .from("tasks")
            .upsert(next.map((task) => taskToRow(task, session.user.id)), {
              onConflict: "id",
            });
        }

        return next;
      });
    },
  };
}
