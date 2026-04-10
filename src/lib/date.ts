const DAY_MS = 24 * 60 * 60 * 1000;

export function todayIso() {
  return toIsoDate(new Date());
}

export function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(value: string, amount: number) {
  const next = parseIsoDate(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return toIsoDate(next);
}

export function diffDays(start: string, end: string) {
  const startTime = parseIsoDate(start).getTime();
  const endTime = parseIsoDate(end).getTime();
  return Math.round((endTime - startTime) / DAY_MS);
}

export function clampDateRange(start: string, end: string) {
  if (diffDays(start, end) >= 0) {
    return { start, end };
  }

  return { start: end, end: start };
}

export function formatShortDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(parseIsoDate(value));
}

export function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(parseIsoDate(value));
}
