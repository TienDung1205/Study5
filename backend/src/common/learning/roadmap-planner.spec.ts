import { calculateRoadmapPlan } from './roadmap-planner';

describe('roadmap planner', () => {
  it('starts a beginner with the foundation phase', () => {
    expect(calculateRoadmapPlan(350, 800, 60, 6, 144)).toEqual({
      estimatedWeeks: 32,
      startingPhasePosition: 1,
      endingPhasePosition: 6,
      scoreGap: 450,
      targetVocabularyCount: 5000,
      estimatedKnownVocabulary: 1167,
      vocabularyGap: 3833,
      newWordsPerDay: 20,
      track: 'MASTERY_800',
    });
  });

  it('shortens the route for a learner already near 800', () => {
    const plan = calculateRoadmapPlan(700, 800, 90, 6, 48);
    expect(plan.startingPhasePosition).toBe(4);
    expect(plan.endingPhasePosition).toBe(6);
    expect(plan.estimatedWeeks).toBe(6);
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
