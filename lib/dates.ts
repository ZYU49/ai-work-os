const CHICAGO_TIME_ZONE = "America/Chicago";
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function localMidnightToUtcDate(year: number, month: number, day: number) {
  const targetUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utcInstant = targetUtc;

  for (let index = 0; index < 3; index += 1) {
    const parts = getTimeZoneParts(new Date(utcInstant), CHICAGO_TIME_ZONE);
    const representedUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const difference = representedUtc - targetUtc;

    if (difference === 0) {
      break;
    }

    utcInstant -= difference;
  }

  return new Date(utcInstant);
}

export function toDateKey(date: Date): string {
  const parts = getTimeZoneParts(date, CHICAGO_TIME_ZONE);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

export function parseDateKey(dateKey: string): Date {
  if (!dateKeyPattern.test(dateKey)) {
    throw new Error("Date must be in YYYY-MM-DD format.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    throw new Error("Date must be a valid calendar date.");
  }

  return localMidnightToUtcDate(year, month, day);
}

export function getDayRange(date: Date): { start: Date; end: Date } {
  const parts = getTimeZoneParts(date, CHICAGO_TIME_ZONE);
  const start = localMidnightToUtcDate(parts.year, parts.month, parts.day);
  const end = localMidnightToUtcDate(parts.year, parts.month, parts.day + 1);

  return { start, end };
}
