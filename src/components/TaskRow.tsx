"use client";

import React from "react";
import { formatShortDate } from "../lib/date";
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
  const timelineReady = Boolean(task.timelineStart && task.timelineEnd);
  const progressWidth = task.timelineStart && task.timelineEnd && task.dueDate
    ? `${Math.max(12, Math.min(100, ((new Date(task.dueDate).getTime() - new Date(task.timelineStart).getTime()) / (new Date(task.timelineEnd).getTime() - new Date(task.timelineStart).getTime() || 1)) * 100))}%`
    : "58%";

  return (
    <tr
      className={`task-row ${isDragging ? "is-dragging" : ""}`}
      draggable
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDragStart={onDragStart}
      onDrop={onDropAbove}
    >
      <td className="drag-cell" aria-hidden="true">
        <span className="drag-handle">⋮⋮</span>
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
                ? `${formatShortDate(task.timelineStart)} to ${formatShortDate(task.timelineEnd)}`
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
            <span className="timeline-separator">to</span>
            <input
              aria-label={`Timeline end for ${taskLabel}`}
              className="row-input"
              onChange={(event) =>
                onFieldChange({ timelineEnd: event.target.value || null })
              }
              type="date"
              value={task.timelineEnd ?? ""}
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
