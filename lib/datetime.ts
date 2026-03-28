const TIME_ZONE = "America/Chicago";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function parseAppointmentTime(input: string, now = new Date()) {
  const trimmed = input.trim();
  const iso = new Date(trimmed);

  if (!Number.isNaN(iso.getTime())) {
    return iso.toISOString();
  }

  const todayMatch = trimmed.match(/^today at (.+)$/i);
  const tomorrowMatch = trimmed.match(/^tomorrow at (.+)$/i);

  if (todayMatch?.[1]) {
    const date = startOfDay(now);
    return applyClock(date, todayMatch[1])?.toISOString() ?? null;
  }

  if (tomorrowMatch?.[1]) {
    const date = startOfDay(now);
    date.setDate(date.getDate() + 1);
    return applyClock(date, tomorrowMatch[1])?.toISOString() ?? null;
  }

  const directClock = applyClock(startOfDay(now), trimmed);

  if (directClock) {
    return directClock.toISOString();
  }

  return null;
}

function applyClock(baseDate: Date, timeText: string) {
  const match = timeText.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const period = match[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  const next = new Date(baseDate);
  let normalizedHours = hours % 12;

  if (period === "PM") {
    normalizedHours += 12;
  }

  next.setHours(normalizedHours, minutes, 0, 0);
  return next;
}

export function formatAppointmentDate(dateText?: string) {
  if (!dateText) {
    return "Unscheduled";
  }

  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function isToday(dateText?: string, now = new Date()) {
  if (!dateText) {
    return false;
  }

  const date = new Date(dateText);
  return date.toDateString() === now.toDateString();
}

export function isTomorrow(dateText?: string, now = new Date()) {
  if (!dateText) {
    return false;
  }

  const date = new Date(dateText);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

export function hoursUntil(dateText?: string, now = new Date()) {
  if (!dateText) {
    return Number.POSITIVE_INFINITY;
  }

  const date = new Date(dateText);
  return (date.getTime() - now.getTime()) / (1000 * 60 * 60);
}
