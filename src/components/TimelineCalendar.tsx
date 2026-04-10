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
              return (
                <div className="timeline-row" key={task.id}>
                  <div className="timeline-row-label">
                    <strong>{task.title}</strong>
                    <span>{formatShortDate(task.timelineStart)} to {formatShortDate(task.timelineEnd)}</span>
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
                        left: offset * DAY_WIDTH,
                        width: length * DAY_WIDTH,
                      }}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
                        setInteraction({
                          type: "move",
                          taskId: task.id,
                          startX: event.clientX,
                        });
                      }}
                      onPointerMove={(event) => {
                        if (!interaction || interaction.taskId !== task.id) {
                          return;
                        }
                        const deltaX = event.clientX - interaction.startX;
                        event.currentTarget.style.transform = `translateX(${deltaX}px)`;
                      }}
                      onPointerUp={(event) => {
                        if (!interaction || interaction.taskId !== task.id) {
                          return;
                        }
                        const deltaX = event.clientX - interaction.startX;
                        event.currentTarget.style.transform = "";
                        commitInteraction(task, deltaX);
                        setInteraction(null);
                      }}
                    >
                      <button
                        aria-label={`Adjust start date for ${task.title}`}
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
                          const deltaX = event.clientX - interaction.startX;
                          const baseWidth = length * DAY_WIDTH;
                          event.currentTarget.parentElement!.style.left = `${offset * DAY_WIDTH + deltaX}px`;
                          event.currentTarget.parentElement!.style.width = `${baseWidth - deltaX}px`;
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
                          const bar = event.currentTarget.parentElement as HTMLDivElement;
                          bar.style.left = `${offset * DAY_WIDTH}px`;
                          bar.style.width = `${length * DAY_WIDTH}px`;
                          commitInteraction(task, deltaX);
                          setInteraction(null);
                        }}
                        type="button"
                      />
                      <span>{task.title}</span>
                      <button
                        aria-label={`Adjust end date for ${task.title}`}
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
                          const deltaX = event.clientX - interaction.startX;
                          event.currentTarget.parentElement!.style.width = `${length * DAY_WIDTH + deltaX}px`;
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
                          const bar = event.currentTarget.parentElement as HTMLDivElement;
                          bar.style.width = `${length * DAY_WIDTH}px`;
                          commitInteraction(task, deltaX);
                          setInteraction(null);
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
