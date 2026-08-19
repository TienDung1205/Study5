import { AiCoachService } from './ai-coach.service';

describe('AiCoachService', () => {
  const service = new AiCoachService();

  it('recommends recovery when the learner is tired', () => {
    const result = service.createFallbackRecommendation({
      currentPhase: 1,
      targetScore: 800,
      completionRate: 0.75,
      studyMinutes: 45,
      weakParts: ['Part 7'],
      mood: 'tired',
      tomorrowAvailableMinutes: 60,
      candidateLessons: [
        {
          id: 'reading-email',
          title: 'Đọc hiểu email',
          durationMinutes: 25,
          skill: 'READING',
        },
        {
          id: 'listening-basic',
          title: 'Nghe cơ bản',
          durationMinutes: 20,
          skill: 'LISTENING',
        },
      ],
    });

    expect(result.usedFallback).toBe(true);
    expect(result.plans).toHaveLength(3);
    expect(result.plans.find((plan) => plan.recommended)?.type).toBe('recovery');
    expect(result.plans[0].lessonIds).toContain('reading-email');
  });
});

