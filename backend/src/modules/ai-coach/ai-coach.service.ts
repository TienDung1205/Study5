import { Injectable } from '@nestjs/common';
import {
  CandidateLessonDto,
  CreateDailyRecommendationDto,
} from './dto/create-daily-recommendation.dto';
import { DailyPlanOption, DailyRecommendation, PlanType } from './ai-coach.types';

const PLAN_LIMITS: Record<PlanType, number> = {
  recovery: 30,
  standard: 60,
  accelerated: 90,
};

@Injectable()
export class AiCoachService {
  createFallbackRecommendation(input: CreateDailyRecommendationDto): DailyRecommendation {
    const prioritizedLessons = this.prioritizeLessons(input.candidateLessons, input.weakParts);
    const recommendedType = this.resolveRecommendedType(input);

    return {
      analysis: {
        strength: input.completionRate >= 0.8 ? 'Khả năng duy trì kế hoạch' : 'Đã ghi nhận tiến độ hôm nay',
        weakness: input.weakParts.join(', ') || 'Chưa đủ dữ liệu',
        reason: this.buildReason(input, recommendedType),
      },
      plans: (Object.keys(PLAN_LIMITS) as PlanType[]).map((type) =>
        this.buildPlan(type, prioritizedLessons, input.tomorrowAvailableMinutes, type === recommendedType),
      ),
      usedFallback: true,
    };
  }

  private resolveRecommendedType(input: CreateDailyRecommendationDto): PlanType {
    if (input.mood === 'tired' || input.completionRate < 0.5) {
      return 'recovery';
    }

    if (input.mood === 'great' && input.completionRate >= 0.9 && input.tomorrowAvailableMinutes >= 90) {
      return 'accelerated';
    }

    return 'standard';
  }

  private prioritizeLessons(
    lessons: CandidateLessonDto[],
    weakParts: string[],
  ): CandidateLessonDto[] {
    const weakText = weakParts.join(' ').toLowerCase();
    const readingIsWeak = /part [5-7]|reading/.test(weakText);
    const listeningIsWeak = /part [1-4]|listening/.test(weakText);

    return [...lessons].sort((left, right) => {
      const leftPriority = this.getSkillPriority(left.skill, readingIsWeak, listeningIsWeak);
      const rightPriority = this.getSkillPriority(right.skill, readingIsWeak, listeningIsWeak);
      return rightPriority - leftPriority;
    });
  }

  private getSkillPriority(skill: string, readingIsWeak: boolean, listeningIsWeak: boolean): number {
    if (readingIsWeak && ['READING', 'GRAMMAR'].includes(skill)) return 2;
    if (listeningIsWeak && skill === 'LISTENING') return 2;
    if (skill === 'REVIEW') return 1;
    return 0;
  }

  private buildPlan(
    type: PlanType,
    lessons: CandidateLessonDto[],
    availableMinutes: number,
    recommended: boolean,
  ): DailyPlanOption {
    const timeLimit = Math.min(PLAN_LIMITS[type], Math.max(20, availableMinutes));
    const selectedLessons: CandidateLessonDto[] = [];
    let totalMinutes = 0;

    for (const lesson of lessons) {
      if (totalMinutes + lesson.durationMinutes <= timeLimit) {
        selectedLessons.push(lesson);
        totalMinutes += lesson.durationMinutes;
      }
    }

    if (selectedLessons.length === 0 && lessons.length > 0) {
      selectedLessons.push(lessons[0]);
      totalMinutes = Math.min(lessons[0].durationMinutes, timeLimit);
    }

    const titles: Record<PlanType, string> = {
      recovery: 'Phục hồi',
      standard: 'Tiêu chuẩn',
      accelerated: 'Tăng tốc',
    };

    return {
      type,
      title: titles[type],
      totalMinutes,
      lessonIds: selectedLessons.map((lesson) => lesson.id),
      recommended,
    };
  }

  private buildReason(input: CreateDailyRecommendationDto, type: PlanType): string {
    if (type === 'recovery') {
      return 'Khối lượng được giảm để giữ thói quen và tránh quá tải.';
    }

    if (type === 'accelerated') {
      return 'Tiến độ và trạng thái hôm nay phù hợp để tăng khối lượng học.';
    }

    return `Kế hoạch cân bằng tiến độ Phase ${input.currentPhase} với thời gian rảnh ngày mai.`;
  }
}
