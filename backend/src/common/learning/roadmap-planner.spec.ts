import { calculateRoadmapPlan, recommendDailyMinutes } from './roadmap-planner';

describe('roadmap planner', () => {
  it('recommends the reference lesson duration from the score gap', () => {
    expect(recommendDailyMinutes(700, 800)).toBe(30);
    expect(recommendDailyMinutes(450, 800)).toBe(60);
    expect(recommendDailyMinutes(100, 800)).toBe(90);
  });

  it('starts a beginner with the foundation phase', () => {
    expect(calculateRoadmapPlan(350, 800, 60, 6, 144)).toEqual({
      estimatedWeeks: 64,
      startingPhasePosition: 1,
      endingPhasePosition: 6,
      scoreGap: 450,
      targetVocabularyCount: 5000,
      estimatedKnownVocabulary: 1167,
      vocabularyGap: 3833,
      newWordsPerDay: 10,
      track: 'MASTERY_800',
    });
  });

  it('shortens the route for a learner already near 800', () => {
    const plan = calculateRoadmapPlan(700, 800, 90, 6, 48);
    expect(plan.startingPhasePosition).toBe(4);
    expect(plan.endingPhasePosition).toBe(6);
    expect(plan.estimatedWeeks).toBe(17);
  });

  it('extends the estimate when the learner chooses fewer new words', () => {
    const gentle = calculateRoadmapPlan(450, 800, 60, 6, 144, 5);
    const standard = calculateRoadmapPlan(450, 800, 60, 6, 144, 15);
    expect(gentle.newWordsPerDay).toBe(5);
    expect(gentle.estimatedWeeks).toBeGreaterThan(standard.estimatedWeeks);
  });

  it('supports an intensive pace of thirty new words per study day', () => {
    const plan = calculateRoadmapPlan(450, 800, 60, 6, 144, 30);
    expect(plan.newWordsPerDay).toBe(30);
  });

  it('supports schedules from five to seven study days per week', () => {
    const fiveDays = calculateRoadmapPlan(450, 800, 60, 5, 144);
    const sevenDays = calculateRoadmapPlan(450, 800, 60, 7, 144);
    expect(fiveDays.estimatedWeeks).toBeGreaterThanOrEqual(sevenDays.estimatedWeeks);
  });

  it.each([4, 8])('rejects a schedule with %i study days per week', (studyDays) => {
    expect(() => calculateRoadmapPlan(450, 800, 60, studyDays, 144)).toThrow(
      'Lịch học phải có từ 5 đến 7 ngày mỗi tuần.',
    );
  });

  it.each([
    [450, 2, 'FOUNDATION_450'],
    [600, 4, 'CORE_600'],
    [700, 5, 'ADVANCED_700'],
    [800, 6, 'MASTERY_800'],
  ] as const)('maps target %i to its ending phase', (target, endingPhasePosition, track) => {
    const plan = calculateRoadmapPlan(300, target, 60, 6, 36);
    expect(plan.endingPhasePosition).toBe(endingPhasePosition);
    expect(plan.track).toBe(track);
  });
});
