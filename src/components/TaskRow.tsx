"use client";

import React from "react";
import { diffDays, formatShortDate, todayIso } from "../lib/date";
import type { Task, TaskPriority, TaskStatus } from "../types/tasks";

const STATUS_OPTIONS: TaskStatus[] = ["working", "stuck", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"];

export function TaskRow({
  task,
  isDragging,
  onDelete,
  onDropAbove,
  onFieldChange,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  isDragging: boolean;
  onDelete: () => void;
  onDropAbove: () => void;
  onFieldChange: (patch: Partial<Task>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const taskLabel = task.title.trim() || "blank task";
  const timelineReady = Boolean(task.timelineStart && task.dueDate);
  const progressWidth = (() => {
    if (!task.timelineStart || !task.dueDate) {
      return "0%";
    }

    const totalDays = Math.max(1, diffDays(task.timelineStart, task.dueDate));
    const elapsedDays = diffDays(task.timelineStart, todayIso());
    const ratio = Math.min(1, Math.max(0, (elapsedDays + 1) / (totalDays + 1)));
    return `${Math.round(ratio * 100)}%`;
  })();

  return (
    <tr
      className={`task-row ${isDragging ? "is-dragging" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDropAbove}
    >
      <td className="drag-cell" aria-hidden="true">
        <button
          aria-label={`Drag ${taskLabel}`}
          className="drag-handle-button"
          draggable
          onDragEnd={onDragEnd}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", task.id);
            onDragStart();
          }}
          type="button"
        >
          <span className="drag-handle">⋮⋮</span>
        </button>
      </td>
      <td>
        <input
          aria-label={`Title for ${taskLabel}`}
          className="row-input row-title"
          onChange={(event) => onFieldChange({ title: event.target.value })}
          placeholder="Blank is okay"
          value={task.title}
        />
      </td>
      <td>
        <select
          aria-label={`Status for ${taskLabel}`}
          className={`row-select status-chip status-${task.status}`}
          onChange={(event) =>
            onFieldChange({ status: event.target.value as TaskStatus })
          }
          value={task.status}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          aria-label={`Due date for ${taskLabel}`}
          className={`row-input ${task.dueDate ? "" : "row-muted"}`}
          onChange={(event) =>
            onFieldChange({ dueDate: event.target.value || null })
          }
          type="date"
          value={task.dueDate ?? ""}
        />
      </td>
      <td>
        <select
          aria-label={`Priority for ${taskLabel}`}
          className={`row-select priority-chip priority-${task.priority}`}
          onChange={(event) =>
            onFieldChange({ priority: event.target.value as TaskPriority })
          }
          value={task.priority}
        >
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="timeline-stack">
          <div className={`timeline-mini ${timelineReady ? "is-ready" : "is-empty"}`}>
            <div className="timeline-mini-track">
              {timelineReady ? (
                <div
                  className={`timeline-mini-fill timeline-${task.status}`}
                  style={{ width: progressWidth }}
                />
              ) : null}
            </div>
            <span className="timeline-mini-label">
              {timelineReady
                ? `${formatShortDate(task.timelineStart)} to ${formatShortDate(task.dueDate)}`
                : "Set a range"}
            </span>
          </div>
          <div className="timeline-inputs">
            <input
              aria-label={`Timeline start for ${taskLabel}`}
              className="row-input"
              onChange={(event) =>
                onFieldChange({ timelineStart: event.target.value || null })
              }
              type="date"
              value={task.timelineStart ?? ""}
            />
          </div>
        </div>
      </td>
      <td className="row-meta row-meta-compact">
        <span>{formatShortDate(task.dueDate)}</span>
        <button
          aria-label={`Delete ${taskLabel}`}
          className="icon-button danger-button"
          onClick={onDelete}
          type="button"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
