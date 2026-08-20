import { calculateRoadmapPlan } from './roadmap-planner';

describe('roadmap planner', () => {
  it('starts a beginner with the foundation phase', () => {
    expect(calculateRoadmapPlan(350, 800, 60, 6)).toEqual({
      estimatedWeeks: 28,
      startingPhasePosition: 1,
      scoreGap: 450,
      track: 'ADVANCED_800',
    });
  });

  it('shortens the route for a learner already near 800', () => {
    const plan = calculateRoadmapPlan(700, 800, 90, 6);
    expect(plan.startingPhasePosition).toBe(4);
    expect(plan.estimatedWeeks).toBe(6);
  });
});
