"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  diffDays,
  formatShortDate,
  parseIsoDate,
  toIsoDate,
  todayIso,
} from "../lib/date";

type Props = {
  value: {
    start: string | null;
    due: string | null;
  };
  onChange: (next: { start: string | null; due: string | null }) => void;
  ariaLabel: string;
  compact?: boolean;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function startOfMonthIso(year: number, monthIndex: number) {
  return toIsoDate(new Date(Date.UTC(year, monthIndex, 1)));
}

function monthTitle(dateIso: string) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(
    parseIsoDate(dateIso),
  );
}

function getCalendarCells(monthIso: string) {
  const monthStart = parseIsoDate(monthIso);
  const weekday = (monthStart.getUTCDay() + 6) % 7;
  const firstCell = addDays(monthIso, -weekday);
  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index));
}

function endOfMonthIso(monthIso: string) {
  const start = parseIsoDate(monthIso);
  return toIsoDate(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)));
}

function inRange(day: string, start: string | null, due: string | null) {
  if (!start || !due) {
    return false;
  }
  return day >= start && day <= due;
}

export function DateRangePicker({ value, onChange, ariaLabel, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const [monthIso, setMonthIso] = useState(() => {
    const base = value.start ?? value.due ?? todayIso();
    const date = parseIsoDate(base);
    return startOfMonthIso(date.getUTCFullYear(), date.getUTCMonth());
  });
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocPointer(event: PointerEvent) {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("pointerdown", onDocPointer);
      return () => document.removeEventListener("pointerdown", onDocPointer);
    }
    return undefined;
  }, [open]);

  const cells = useMemo(() => getCalendarCells(monthIso), [monthIso]);
  const monthEnd = useMemo(() => endOfMonthIso(monthIso), [monthIso]);
  const selectedDays =
    value.start && value.due
      ? Math.max(1, diffDays(value.start, value.due) + 1)
      : 0;

  return (
    <div className={`date-range-field ${compact ? "is-compact" : ""}`} ref={rootRef}>
      <button
        aria-label={ariaLabel}
        className="date-range-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="date-range-title">
          {value.start ? formatShortDate(value.start) : "Start date"}
          <span className="date-range-sep">to</span>
          {value.due ? formatShortDate(value.due) : "Due date"}
        </span>
        <span className="date-range-icon">Set</span>
      </button>

      {open ? (
        <div className="date-range-popover" role="dialog">
          <div className="date-range-popover-head">
            <strong>Set dates</strong>
            <span>{selectedDays > 0 ? `${selectedDays} days selected` : "Pick start and due"}</span>
          </div>

          <div className="date-range-summary">
            <span>{value.start ? formatShortDate(value.start) : "Start date"}</span>
            <span>{value.due ? formatShortDate(value.due) : "Due date"}</span>
          </div>

          <div className="date-range-nav">
            <button
              aria-label="Previous month"
              className="ghost-button date-nav-btn"
              onClick={() => {
                const start = parseIsoDate(monthIso);
                setMonthIso(startOfMonthIso(start.getUTCFullYear(), start.getUTCMonth() - 1));
              }}
              type="button"
            >
              ←
            </button>
            <strong>{monthTitle(monthIso)}</strong>
            <button
              aria-label="Next month"
              className="ghost-button date-nav-btn"
              onClick={() => {
                const start = parseIsoDate(monthIso);
                setMonthIso(startOfMonthIso(start.getUTCFullYear(), start.getUTCMonth() + 1));
              }}
              type="button"
            >
              →
            </button>
          </div>

          <div className="date-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="date-grid">
            {cells.map((day) => {
              const isInMonth = day >= monthIso && day <= monthEnd;
              const isStart = value.start === day;
              const isDue = value.due === day;
              const isSelected = inRange(day, value.start, value.due);

              return (
                <button
                  className={`date-cell ${isSelected ? "is-selected" : ""} ${isStart ? "is-start" : ""} ${isDue ? "is-due" : ""} ${isInMonth ? "" : "is-muted"}`}
                  key={day}
                  onClick={() => {
                    if (!value.start || (value.start && value.due)) {
                      onChange({ start: day, due: null });
                      return;
                    }

                    if (day < value.start) {
                      onChange({ start: day, due: value.start });
                      return;
                    }

                    onChange({ start: value.start, due: day });
                  }}
                  type="button"
                >
                  {day.slice(-2)}
                </button>
              );
            })}
          </div>

          <div className="date-range-actions">
            <button
              className="ghost-button"
              onClick={() => onChange({ start: null, due: null })}
              type="button"
            >
              Clear
            </button>
            <button className="primary-button" onClick={() => setOpen(false)} type="button">
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
