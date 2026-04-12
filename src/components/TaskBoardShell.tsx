"use client";

import React from "react";
import { TimelineCalendar } from "./TimelineCalendar";
import { TaskTable } from "./TaskTable";
import { useTaskBoard } from "../hooks/useTaskBoard";

export function TaskBoardShell() {
  const board = useTaskBoard();
  const adminEmails =
    process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const isAdmin =
    board.user?.email && adminEmails.includes(board.user.email.toLowerCase());

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Crepe</p>
          <h1>Be Quiet, and work.</h1>
          <p className="hero-copy">
            A focused table for tasks, a timeline for momentum, and none of the
            dashboard noise.
          </p>
        </div>
        <div className="hero-meta">
          <span>{board.grouped.todo.length} open tasks</span>
          <span>{board.grouped.completed.length} completed</span>
        </div>
      </section>

      {board.hydrated ? (
        board.authEnabled && !board.session ? (
          <section className="panel auth-panel">
            <p className="eyebrow">Sign in required</p>
            <h2>Try Crepe with your Google account</h2>
            <p className="hero-copy">
              Sign in to create your own board and let others try the product.
            </p>
            <button className="primary-button" onClick={board.signInWithGoogle} type="button">
              Continue with Google
            </button>
          </section>
        ) : (
        <>
          <TaskTable
            completed={board.grouped.completed}
            onAddTask={(draft) => board.addTask(draft)}
            onDeleteTask={board.deleteTask}
            onReorderTask={board.reorderTask}
            onUpdateTask={board.updateTask}
            todo={board.grouped.todo}
          />
          <TimelineCalendar onUpdateTask={board.updateTask} tasks={board.tasks} />
          {board.authEnabled ? (
            <section className="panel account-panel">
              <p>Signed in as {board.user?.email}</p>
              <div className="account-actions">
                {isAdmin ? (
                  <a className="ghost-button" href="/admin">
                    View user activity
                  </a>
                ) : null}
                <button className="ghost-button" onClick={board.signOut} type="button">
                  Sign out
                </button>
              </div>
            </section>
          ) : null}
        </>
        )
      ) : (
        <div className="panel loading-panel">Loading workspace…</div>
      )}
    </main>
  );
}
