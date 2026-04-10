"use client";

import React, { useMemo, useState } from "react";
import { addDays, diffDays, formatMonthLabel, formatShortDate, todayIso } from "../lib/date";
import { moveTimeline, resizeTimeline } from "../lib/tasks";
import type { Task } from "../types/tasks";

type InteractionState =
  | {
      type: "move";
      taskId: string;
      startX: number;
    }
  | {
      type: "resize";
      taskId: string;
      edge: "start" | "end";
      startX: number;
    }
  | null;

const DAY_WIDTH = 40;
const LABEL_WIDTH = 320;

function timelineColor(task: Task) {
  if (task.status === "done") {
    return "timeline-done";
  }
  if (task.status === "stuck") {
    return "timeline-stuck";
  }
  return "timeline-working";
}

export function TimelineCalendar({
  tasks,
  onUpdateTask,
}: {
  tasks: Task[];
  onUpdateTask: (taskId: string, patch: Partial<Task>) => void;
}) {
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const [liveDelta, setLiveDelta] = useState(0);
  const timelineTasks = useMemo(
    () => tasks.filter((task) => task.timelineStart && task.dueDate),
    [tasks],
  );

  const bounds = useMemo(() => {
    const starts = timelineTasks.map((task) => task.timelineStart as string);
    const ends = timelineTasks.map((task) => task.dueDate as string);
    const today = todayIso();

    const min = starts.concat(today).sort()[0] ?? today;
    const max = ends.concat(addDays(today, 14)).sort().at(-1) ?? addDays(today, 14);
    const start = addDays(min, -2);
    const end = addDays(max, 2);
    const days = diffDays(start, end) + 1;

    return { start, end, days };
  }, [timelineTasks]);

  const columns = useMemo(
    () => Array.from({ length: bounds.days }, (_, index) => addDays(bounds.start, index)),
    [bounds.days, bounds.start],
  );

  const monthLabels = useMemo(() => {
    const result: Array<{ date: string; label: string; span: number }> = [];
    let currentLabel = "";
    let currentStart = "";
    let currentSpan = 0;

    columns.forEach((date, index) => {
      const label = formatMonthLabel(date);
      if (label !== currentLabel) {
        if (currentLabel) {
          result.push({ date: currentStart, label: currentLabel, span: currentSpan });
        }
        currentLabel = label;
        currentStart = date;
        currentSpan = 1;
      } else {
        currentSpan += 1;
      }

      if (index === columns.length - 1) {
        result.push({ date: currentStart, label: currentLabel, span: currentSpan });
      }
    });

    return result;
  }, [columns]);

  function commitInteraction(task: Task, deltaX: number) {
    const deltaDays = Math.round(deltaX / DAY_WIDTH);
    if (!interaction || deltaDays === 0) {
      return;
    }

    const patch =
      interaction.type === "move"
        ? moveTimeline(task, deltaDays)
        : resizeTimeline(task, interaction.edge, deltaDays);
    onUpdateTask(task.id, patch);
  }

  function getPreviewDates(task: Task) {
    if (!task.timelineStart || !task.dueDate) {
      return null;
    }

    if (!interaction || interaction.taskId !== task.id) {
      return { start: task.timelineStart, due: task.dueDate };
    }

    const deltaDays = Math.round(liveDelta / DAY_WIDTH);
    if (deltaDays === 0) {
      return { start: task.timelineStart, due: task.dueDate };
    }

    if (interaction.type === "move") {
      const patch = moveTimeline(task, deltaDays);
      return { start: patch.timelineStart as string, due: patch.dueDate as string };
    }

    const patch = resizeTimeline(task, interaction.edge, deltaDays);
    return { start: patch.timelineStart as string, due: patch.dueDate as string };
  }

  return (
    <div className="panel">
      <div className="panel-header timeline-header">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>Timeline</h2>
        </div>
        <p className="timeline-caption">
          Drag the bar to move a schedule. Drag each handle to adjust start or due date.
        </p>
      </div>

      <div className="timeline-panel">
        <div className="timeline-shell">
          <div className="timeline-axis">
            <div className="timeline-axis-row">
              <div className="timeline-axis-spacer" />
              <div className="timeline-axis-track">
                <div className="timeline-months">
                  {monthLabels.map((month) => (
                    <div
                      className="timeline-month"
                      key={month.date}
                      style={{ width: month.span * DAY_WIDTH }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
                <div className="timeline-days">
                  {columns.map((date) => (
                    <div
                      className={`timeline-day ${date === todayIso() ? "is-today" : ""}`}
                      key={date}
                      style={{ width: DAY_WIDTH }}
                    >
                      <span>{date.slice(-2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="timeline-grid">
            {timelineTasks.map((task) => {
              const preview = getPreviewDates(task);
              if (!preview) {
                return null;
              }

              const offset = diffDays(bounds.start, preview.start);
              const length = diffDays(preview.start, preview.due) + 1;
              return (
                <div className="timeline-row" key={task.id}>
                  <div className="timeline-row-label" style={{ width: LABEL_WIDTH }}>
                    <strong>{task.title.trim() || "Blank task"}</strong>
                    <span>
                      {formatShortDate(preview.start)} to {formatShortDate(preview.due)}
                    </span>
                  </div>

                  <div className="timeline-track-grid">
                    {columns.map((date) => (
                      <div
                        className={`timeline-cell ${date === todayIso() ? "is-today" : ""}`}
                        key={date}
                        style={{ width: DAY_WIDTH }}
                      />
                    ))}

                    <div
                      className={`timeline-bar ${timelineColor(task)}`}
                      style={{
                        left: offset * DAY_WIDTH,
                        width: Math.max(DAY_WIDTH, length * DAY_WIDTH),
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
                        setInteraction({
                          type: "move",
                          taskId: task.id,
                          startX: event.clientX,
                        });
                        setLiveDelta(0);
                      }}
                      onPointerMove={(event) => {
                        if (!interaction || interaction.taskId !== task.id) {
                          return;
                        }
                        setLiveDelta(event.clientX - interaction.startX);
                      }}
                      onPointerUp={(event) => {
                        if (!interaction || interaction.taskId !== task.id) {
                          return;
                        }
                        commitInteraction(task, event.clientX - interaction.startX);
                        setInteraction(null);
                        setLiveDelta(0);
                      }}
                    >
                      <button
                        aria-label={`Adjust start date for ${task.title.trim() || "blank task"}`}
                        className="timeline-handle"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
                          setInteraction({
                            type: "resize",
                            taskId: task.id,
                            edge: "start",
                            startX: event.clientX,
                          });
                          setLiveDelta(0);
                        }}
                        onPointerMove={(event) => {
                          if (
                            !interaction ||
                            interaction.taskId !== task.id ||
                            interaction.type !== "resize" ||
                            interaction.edge !== "start"
                          ) {
                            return;
                          }
                          setLiveDelta(event.clientX - interaction.startX);
                        }}
                        onPointerUp={(event) => {
                          if (
                            !interaction ||
                            interaction.taskId !== task.id ||
                            interaction.type !== "resize" ||
                            interaction.edge !== "start"
                          ) {
                            return;
                          }
                          commitInteraction(task, event.clientX - interaction.startX);
                          setInteraction(null);
                          setLiveDelta(0);
                        }}
                        type="button"
                      />
                      <div className="timeline-bar-copy">
                        <span>{task.title.trim() || "Blank task"}</span>
                        <small>{length} days</small>
                      </div>
                      <button
                        aria-label={`Adjust due date for ${task.title.trim() || "blank task"}`}
                        className="timeline-handle"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
                          setInteraction({
                            type: "resize",
                            taskId: task.id,
                            edge: "end",
                            startX: event.clientX,
                          });
                          setLiveDelta(0);
                        }}
                        onPointerMove={(event) => {
                          if (
                            !interaction ||
                            interaction.taskId !== task.id ||
                            interaction.type !== "resize" ||
                            interaction.edge !== "end"
                          ) {
                            return;
                          }
                          setLiveDelta(event.clientX - interaction.startX);
                        }}
                        onPointerUp={(event) => {
                          if (
                            !interaction ||
                            interaction.taskId !== task.id ||
                            interaction.type !== "resize" ||
                            interaction.edge !== "end"
                          ) {
                            return;
                          }
                          commitInteraction(task, event.clientX - interaction.startX);
                          setInteraction(null);
                          setLiveDelta(0);
                        }}
                        type="button"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {timelineTasks.length === 0 ? (
              <div className="timeline-empty">
                Add a start date and due date on any task to show it on this calendar.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
