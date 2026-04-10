"use client";

import React, { useMemo, useRef, useState } from "react";
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

const DAY_WIDTH = 34;

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
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const [liveDelta, setLiveDelta] = useState(0);
  const timelineTasks = useMemo(
    () => tasks.filter((task) => task.timelineStart && task.timelineEnd),
    [tasks],
  );

  const bounds = useMemo(() => {
    const starts = timelineTasks.map((task) => task.timelineStart as string);
    const ends = timelineTasks.map((task) => task.timelineEnd as string);
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

  function getPreview(taskId: string, type: "move" | "resize", edge?: "start" | "end") {
    if (!interaction || interaction.taskId !== taskId || interaction.type !== type) {
      return null;
    }

    if (type === "resize" && interaction.type === "resize" && interaction.edge !== edge) {
      return null;
    }

    return liveDelta;
  }

  return (
    <div className="panel">
      <div className="panel-header timeline-header">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>Timeline</h2>
        </div>
        <p className="timeline-caption">
          Drag bars to move work. Drag the handles to change duration.
        </p>
      </div>

      <div className="timeline-panel">
        <div className="timeline-shell">
          <div className="timeline-axis">
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

          <div className="timeline-grid" ref={canvasRef}>
            {timelineTasks.map((task) => {
              const offset = diffDays(bounds.start, task.timelineStart as string);
              const length = diffDays(task.timelineStart as string, task.timelineEnd as string) + 1;
              const movePreview = getPreview(task.id, "move") ?? 0;
              const resizeStartPreview = getPreview(task.id, "resize", "start") ?? 0;
              const resizeEndPreview = getPreview(task.id, "resize", "end") ?? 0;
              const previewLeft = offset * DAY_WIDTH + movePreview + resizeStartPreview;
              const previewWidth = Math.max(
                DAY_WIDTH,
                length * DAY_WIDTH + resizeEndPreview - resizeStartPreview,
              );
              return (
                <div className="timeline-row" key={task.id}>
                  <div className="timeline-row-label">
                    <strong>{task.title.trim() || "Blank task"}</strong>
                    <span>
                      {formatShortDate(task.timelineStart)} to {formatShortDate(task.timelineEnd)}
                    </span>
                  </div>
                  <div className="timeline-track">
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
                        left: previewLeft,
                        width: previewWidth,
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
                        const deltaX = event.clientX - interaction.startX;
                        commitInteraction(task, deltaX);
                        setInteraction(null);
                        setLiveDelta(0);
                      }}
                    >
                      <div className="timeline-bar-progress" />
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
                          const deltaX = event.clientX - interaction.startX;
                          commitInteraction(task, deltaX);
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
                        aria-label={`Adjust end date for ${task.title.trim() || "blank task"}`}
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
                          const deltaX = event.clientX - interaction.startX;
                          commitInteraction(task, deltaX);
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
                Add a start and end date to any task to see it here.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
