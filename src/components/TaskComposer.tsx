"use client";

import React, { useState } from "react";
import { DateRangePicker } from "./DateRangePicker";
import type { TaskDraft, TaskPriority, TaskStatus } from "../types/tasks";

const STATUS_OPTIONS: TaskStatus[] = ["working", "stuck", "done"];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"];

const EMPTY_DRAFT: TaskDraft = {
  title: "",
  status: "working",
  priority: "medium",
  dueDate: null,
  timelineStart: null,
};

export function TaskComposer({
  onCreate,
}: {
  onCreate: (draft: TaskDraft) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);

  function closeComposer() {
    setIsOpen(false);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="task-composer-shell">
      <button
        className="primary-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        New task
      </button>

      {isOpen ? (
        <form
          aria-label="Create task"
          className="composer-card"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(draft);
            closeComposer();
          }}
        >
          <div className="composer-head">
            <div>
              <p className="eyebrow">New task</p>
              <h3>Add a clear next step</h3>
            </div>
            <button
              aria-label="Close new task dialog"
              className="ghost-button composer-close"
              onClick={closeComposer}
              type="button"
            >
              Close
            </button>
          </div>

          <label className="composer-field">
            <span>Task</span>
            <input
              aria-label="New task title"
              autoFocus
              className="task-composer-input"
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="What needs to get done?"
              value={draft.title ?? ""}
            />
          </label>

          <div className="composer-grid composer-grid-dual">
            <label className="composer-field">
              <span>Status</span>
              <select
                aria-label="New task status"
                className={`row-select status-chip status-${draft.status ?? "working"}`}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as TaskStatus,
                  }))
                }
                value={draft.status ?? "working"}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="composer-field">
              <span>Priority</span>
              <select
                aria-label="New task priority"
                className={`row-select priority-chip priority-${draft.priority ?? "medium"}`}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priority: event.target.value as TaskPriority,
                  }))
                }
                value={draft.priority ?? "medium"}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="composer-grid">
            <label className="composer-field">
              <span>Schedule</span>
              <DateRangePicker
                ariaLabel="New task schedule"
                onChange={(next) =>
                  setDraft((current) => ({
                    ...current,
                    timelineStart: next.start,
                    dueDate: next.due,
                  }))
                }
                value={{
                  start: draft.timelineStart ?? null,
                  due: draft.dueDate ?? null,
                }}
              />
            </label>
          </div>

          <div className="composer-actions">
            <button className="ghost-button" onClick={closeComposer} type="button">
              Cancel
            </button>
            <button className="primary-button" type="submit">
              Add task
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
