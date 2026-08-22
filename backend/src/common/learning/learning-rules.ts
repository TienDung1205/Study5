export const MASTERY_THRESHOLD = 0.8;
export const LESSON_PRACTICE_PASS_THRESHOLD = 0.6;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getWeekdayIndex(value: Date, timezone: string): number {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(value);
    const index = WEEKDAYS.indexOf(weekday);
    return index >= 0 ? index : value.getUTCDay();
  } catch {
    return value.getUTCDay();
  }
}

export function getHourInTimezone(value: Date, timezone: string): number {
  try {
    const hour = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hourCycle: 'h23',
      timeZone: timezone,
    }).format(value);
    const parsedHour = Number.parseInt(hour, 10);
    return Number.isNaN(parsedHour) ? value.getUTCHours() : parsedHour;
  } catch {
    return value.getUTCHours();
  }
}

export function getMinuteInTimezone(value: Date, timezone: string): number {
  try {
    const minute = new Intl.DateTimeFormat('en-US', {
      minute: '2-digit',
      timeZone: timezone,
    }).format(value);
    const parsedMinute = Number.parseInt(minute, 10);
    return Number.isNaN(parsedMinute) ? value.getUTCMinutes() : parsedMinute;
  } catch {
    return value.getUTCMinutes();
  }
}

export function getDateKeyInTimezone(value: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: timezone,
    }).formatToParts(value);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch {
    return value.toISOString().slice(0, 10);
  }
}

export function isStudyDay(value: Date, studyDays: number[], timezone: string): boolean {
  return studyDays.includes(getWeekdayIndex(value, timezone));
}

export function isNextScheduledStudyDay(
  lastDate: Date,
  completedDate: Date,
  studyDays: number[],
  timezone: string,
): boolean {
  const candidate = new Date(lastDate);
  for (let offset = 1; offset <= 7; offset += 1) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
    if (isStudyDay(candidate, studyDays, timezone)) return candidate.getTime() === completedDate.getTime();
  }
  return false;
}
