export const MASTERY_THRESHOLD = 0.8;
export const MIN_TRACKED_STUDY_RATIO = 0.5;

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
