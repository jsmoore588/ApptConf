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
  const nextMatch = trimmed.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(.+)$/i);
  const weekdayMatch = trimmed.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(.+)$/i);

  if (todayMatch?.[1]) {
    const date = startOfDay(now);
    return applyClock(date, todayMatch[1])?.toISOString() ?? null;
  }

  if (tomorrowMatch?.[1]) {
    const date = startOfDay(now);
    date.setDate(date.getDate() + 1);
    return applyClock(date, tomorrowMatch[1])?.toISOString() ?? null;
  }

  if (nextMatch?.[1] && nextMatch[2]) {
    const date = nextWeekday(now, nextMatch[1], true);
    return applyClock(date, nextMatch[2])?.toISOString() ?? null;
  }

  if (weekdayMatch?.[1] && weekdayMatch[2]) {
    const date = nextWeekday(now, weekdayMatch[1], false);
    return applyClock(date, weekdayMatch[2])?.toISOString() ?? null;
  }

  const monthDayClock = parseMonthDayTime(trimmed, now);

  if (monthDayClock) {
    return monthDayClock.toISOString();
  }

  const directClock = applyClock(startOfDay(now), trimmed);

  if (directClock) {
    if (directClock.getTime() <= now.getTime()) {
      directClock.setDate(directClock.getDate() + 1);
    }

    return directClock.toISOString();
  }

  return null;
}

function nextWeekday(now: Date, weekdayText: string, forceNextWeek: boolean) {
  const target = weekdayIndex(weekdayText);
  const base = startOfDay(now);
  const current = base.getDay();
  let diff = (target - current + 7) % 7;

  if (diff === 0 || forceNextWeek) {
    diff = diff === 0 ? 7 : diff + 7;
  }

  base.setDate(base.getDate() + diff);
  return base;
}

function weekdayIndex(value: string) {
  return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(
    value.toLowerCase()
  );
}

function parseMonthDayTime(input: string, now: Date) {
  const match = input.match(
    /^(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})|(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?)\s*(?:at)?\s+(.+)$/i
  );

  if (!match) {
    return null;
  }

  const month = match[1] ? monthIndex(match[1]) : Number(match[3]) - 1;
  const day = match[2] ? Number(match[2]) : Number(match[4]);
  const explicitYear = match[5] ? normalizeYear(Number(match[5])) : now.getFullYear();
  const clock = match[6];

  if (month < 0 || month > 11 || day < 1 || day > 31) {
    return null;
  }

  const base = new Date(now);
  base.setFullYear(explicitYear, month, day);
  base.setHours(0, 0, 0, 0);

  const parsed = applyClock(base, clock);

  if (!parsed) {
    return null;
  }

  if (!match[5] && parsed.getTime() < now.getTime()) {
    parsed.setFullYear(parsed.getFullYear() + 1);
  }

  return parsed;
}

function monthIndex(value: string) {
  const normalized = value.toLowerCase().slice(0, 3);
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(
    normalized
  );
}

function normalizeYear(value: number) {
  return value < 100 ? 2000 + value : value;
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
