import { getWeekdayIndex, isNextScheduledStudyDay, isStudyDay, MASTERY_THRESHOLD } from './learning-rules';

describe('learning rules', () => {
  const mondayToSaturday = [1, 2, 3, 4, 5, 6];

  it('treats Sunday as a rest day', () => {
    const sunday = new Date('2026-08-23T00:00:00.000Z');
    expect(getWeekdayIndex(sunday, 'Asia/Bangkok')).toBe(0);
    expect(isStudyDay(sunday, mondayToSaturday, 'Asia/Bangkok')).toBe(false);
  });

  it('keeps the streak from Saturday to Monday when Sunday is a rest day', () => {
    const saturday = new Date('2026-08-22T00:00:00.000Z');
    const monday = new Date('2026-08-24T00:00:00.000Z');
    expect(isNextScheduledStudyDay(saturday, monday, mondayToSaturday, 'Asia/Bangkok')).toBe(true);
  });

  it('uses an eighty-percent mastery threshold', () => {
    expect(MASTERY_THRESHOLD).toBe(0.8);
    expect(16 / 20).toBeGreaterThanOrEqual(MASTERY_THRESHOLD);
    expect(15 / 20).toBeLessThan(MASTERY_THRESHOLD);
  });
});
