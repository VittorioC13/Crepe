"use client";

import React from "react";
import { TimelineCalendar } from "./TimelineCalendar";
import { TaskTable } from "./TaskTable";
import { useTaskBoard } from "../hooks/useTaskBoard";

export function TaskBoardShell() {
  const board = useTaskBoard();

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
        <>
          <TaskTable
            completed={board.grouped.completed}
            onAddTask={(title) => board.addTask({ title })}
            onDeleteTask={board.deleteTask}
            onReorderTask={board.reorderTask}
            onUpdateTask={board.updateTask}
            todo={board.grouped.todo}
          />
          <TimelineCalendar onUpdateTask={board.updateTask} tasks={board.tasks} />
        </>
      ) : (
        <div className="panel loading-panel">Loading workspace…</div>
      )}
    </main>
  );
}
