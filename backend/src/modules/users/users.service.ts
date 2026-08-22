import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  calculateRoadmapPlan,
  MAX_STUDY_DAYS_PER_WEEK,
  MIN_STUDY_DAYS_PER_WEEK,
  recommendDailyMinutes,
} from '../../common/learning/roadmap-planner';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateLearningGoalDto } from './dto/update-learning-goal.dto';

function getEstimatedCompletionDate(estimatedWeeks: number, referenceDate = new Date()): Date {
  const completionDate = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  ));
  completionDate.setUTCDate(completionDate.getUTCDate() + estimatedWeeks * 7);
  return completionDate;
}

function parseExamDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new BadRequestException('Ngày dự thi không hợp lệ hoặc sai định dạng YYYY-MM-DD.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maximumDay = month === 2
    ? (year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0) ? 29 : 28)
    : ([4, 6, 9, 11].includes(month) ? 30 : 31);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > maximumDay) {
    throw new BadRequestException('Ngày dự thi không tồn tại. Hãy kiểm tra lại ngày, tháng và năm.');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function validateExamDate(examDate: Date | null, estimatedWeeks: number): void {
  if (!examDate) return;
  const latestExamDate = new Date();
  latestExamDate.setUTCHours(0, 0, 0, 0);
  latestExamDate.setUTCFullYear(latestExamDate.getUTCFullYear() + 20);
  if (Number.isNaN(examDate.getTime()) || examDate > latestExamDate) {
    throw new BadRequestException(
      `Ngày dự thi không hợp lệ hoặc không được quá ${latestExamDate.toLocaleDateString('vi-VN', { timeZone: 'UTC' })}.`,
    );
  }
  const minimumExamDate = getEstimatedCompletionDate(estimatedWeeks);
  if (examDate < minimumExamDate) {
    throw new BadRequestException(
      `Ngày dự thi phải từ ${minimumExamDate.toLocaleDateString('vi-VN', { timeZone: 'UTC' })} trở đi, sau khi hoàn thành lộ trình dự kiến. Hãy tăng nhịp học để tính lại hoặc chọn ngày thi muộn hơn.`,
    );
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        timezone: true,
        createdAt: true,
        learningGoal: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
            currentPhase: { select: { id: true, title: true, position: true } },
          },
        },
        progress: true,
        badges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
      },
    });
  }

  async updateLearningGoal(userId: string, input: UpdateLearningGoalDto) {
    const studyDays = input.studyDays ? [...new Set(input.studyDays)] : undefined;
    if (studyDays && (studyDays.length < MIN_STUDY_DAYS_PER_WEEK
      || studyDays.length > MAX_STUDY_DAYS_PER_WEEK
      || studyDays.some((day) => day < 0 || day > 6))) {
      throw new BadRequestException('Lộ trình yêu cầu từ 5 đến 7 ngày học khác nhau trong tuần.');
    }
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: { currentPhase: { select: { position: true } }, course: { include: { phases: true } } },
    });
    if (!goal?.course || !goal.currentPhase) throw new NotFoundException('Chưa có lộ trình để cập nhật.');
    const nextStudyDays = studyDays ?? goal.studyDays;
    const targetScore = input.targetScore ?? goal.targetScore;
    const currentScore = goal.currentScore ?? 0;
    const dailyMinutes = recommendDailyMinutes(currentScore, targetScore);
    if (targetScore <= currentScore) {
      throw new BadRequestException('Mục tiêu TOEIC phải cao hơn điểm checkpoint hiện tại.');
    }
    const draftPlan = calculateRoadmapPlan(
      currentScore,
      targetScore,
      dailyMinutes,
      nextStudyDays.length,
      0,
      input.newWordsPerDay ?? goal.newWordsPerDay,
    );
    if (draftPlan.endingPhasePosition < goal.currentPhase.position) {
      throw new BadRequestException('Mục tiêu này thấp hơn Phase bạn đang học. Hãy chọn một mục tiêu cao hơn.');
    }
    const requiredStudyDays = goal.course.phases
      .filter((phase) => phase.position >= goal.currentPhase!.position && phase.position <= draftPlan.endingPhasePosition)
      .reduce((total, phase) => total + phase.durationDays, 0);
    const plan = calculateRoadmapPlan(
      currentScore,
      targetScore,
      dailyMinutes,
      nextStudyDays.length,
      requiredStudyDays,
      input.newWordsPerDay ?? goal.newWordsPerDay,
    );
    const submittedExamDate = input.examDate === undefined ? undefined : parseExamDate(input.examDate);
    const effectiveExamDate = submittedExamDate === undefined
      ? (goal.examDateIsCustom ? goal.examDate : null)
      : submittedExamDate;
    validateExamDate(effectiveExamDate, plan.estimatedWeeks);
    return this.prisma.learningGoal.update({
      where: { userId },
      data: {
        targetScore,
        endingPhasePosition: plan.endingPhasePosition,
        targetTrack: plan.track,
        studyDays,
        dailyMinutes,
        preferredHour: input.preferredHour,
        preferredMinute: input.preferredMinute,
        newWordsPerDay: input.newWordsPerDay,
        estimatedWeeks: plan.estimatedWeeks,
        vocabularyPaceSetAt: input.newWordsPerDay === undefined ? undefined : new Date(),
        examDate: submittedExamDate,
        examDateIsCustom: input.examDate === undefined ? undefined : Boolean(input.examDate),
        goalAchievedAt: input.targetScore === undefined ? undefined : null,
      },
    });
  }

  async completeOnboarding(userId: string, input: CompleteOnboardingDto) {
    if (input.targetScore <= input.currentScore) {
      throw new BadRequestException('Điểm mục tiêu phải lớn hơn điểm hiện tại.');
    }
    const studyDays = [...new Set(input.studyDays)].sort();
    if (studyDays.length < MIN_STUDY_DAYS_PER_WEEK
      || studyDays.length > MAX_STUDY_DAYS_PER_WEEK
      || studyDays.some((day) => day < 0 || day > 6)) {
      throw new BadRequestException('Lộ trình yêu cầu từ 5 đến 7 ngày học khác nhau trong tuần.');
    }
    const course = await this.prisma.course.findFirst({
      where: { isPublished: true },
      include: { phases: { orderBy: { position: 'asc' } } },
    });
    if (!course?.phases.length) throw new NotFoundException('Chưa có lộ trình được phát hành.');

    const dailyMinutes = recommendDailyMinutes(input.currentScore, input.targetScore);
    const draftPlan = calculateRoadmapPlan(input.currentScore, input.targetScore, dailyMinutes, studyDays.length);
    const requiredStudyDays = course.phases
      .filter((phase) => phase.position >= draftPlan.startingPhasePosition && phase.position <= draftPlan.endingPhasePosition)
      .reduce((total, phase) => total + phase.durationDays, 0);
    const plan = calculateRoadmapPlan(input.currentScore, input.targetScore, dailyMinutes, studyDays.length, requiredStudyDays);
    const startingPhase = course.phases.find((phase) => phase.position === plan.startingPhasePosition) ?? course.phases[0];
    const endingPhase = course.phases.find((phase) => phase.position === plan.endingPhasePosition) ?? course.phases.at(-1)!;
    const suggestedExamDate = new Date();
    suggestedExamDate.setUTCDate(suggestedExamDate.getUTCDate() + plan.estimatedWeeks * 7);
    const examDate = parseExamDate(input.examDate);
    validateExamDate(examDate, plan.estimatedWeeks);

    const learningGoal = await this.prisma.learningGoal.upsert({
      where: { userId },
      update: {
        courseId: course.id,
        currentPhaseId: startingPhase.id,
        currentScore: input.currentScore,
        targetScore: input.targetScore,
        dailyMinutes,
        studyDays,
        preferredHour: input.preferredHour ?? 20,
        preferredMinute: input.preferredMinute ?? 0,
        newWordsPerDay: plan.newWordsPerDay,
        vocabularyPaceSetAt: null,
        examDate,
        examDateIsCustom: Boolean(input.examDate),
        estimatedWeeks: plan.estimatedWeeks,
        startingPhasePosition: startingPhase.position,
        endingPhasePosition: endingPhase.position,
        targetTrack: plan.track,
        goalAchievedAt: null,
        lastCheckpointAt: null,
        onboardingCompletedAt: new Date(),
      },
      create: {
        userId,
        courseId: course.id,
        currentPhaseId: startingPhase.id,
        currentScore: input.currentScore,
        targetScore: input.targetScore,
        dailyMinutes,
        studyDays,
        preferredHour: input.preferredHour ?? 20,
        preferredMinute: input.preferredMinute ?? 0,
        newWordsPerDay: plan.newWordsPerDay,
        examDate,
        examDateIsCustom: Boolean(input.examDate),
        estimatedWeeks: plan.estimatedWeeks,
        startingPhasePosition: startingPhase.position,
        endingPhasePosition: endingPhase.position,
        targetTrack: plan.track,
        onboardingCompletedAt: new Date(),
      },
      include: { currentPhase: true, course: true },
    });

    return {
      learningGoal,
      plan: {
        ...plan,
        startingPhaseTitle: startingPhase.title,
        endingPhaseTitle: endingPhase.title,
        suggestedExamDate,
        phases: course.phases
          .filter((phase) => phase.position >= startingPhase.position && phase.position <= endingPhase.position)
          .map((phase) => ({ position: phase.position, title: phase.title, durationDays: phase.durationDays })),
      },
    };
  }

  async upgradeLearningGoal(userId: string, targetScore: number) {
    const goal = await this.prisma.learningGoal.findUnique({
      where: { userId },
      include: {
        currentPhase: { select: { id: true, position: true } },
        course: { include: { phases: { orderBy: { position: 'asc' } } } },
      },
    });
    if (!goal?.course || !goal.currentPhase) {
      throw new NotFoundException('Chưa có lộ trình để nâng mục tiêu.');
    }
    if (targetScore <= goal.targetScore) {
      throw new BadRequestException('Mục tiêu mới phải cao hơn mục tiêu hiện tại.');
    }

    const dailyMinutes = recommendDailyMinutes(goal.currentScore ?? goal.targetScore, targetScore);

    const draftPlan = calculateRoadmapPlan(
      goal.currentScore ?? goal.targetScore,
      targetScore,
      dailyMinutes,
      goal.studyDays.length,
      0,
      goal.newWordsPerDay,
    );
    const requiredStudyDays = goal.course.phases
      .filter((phase) => phase.position >= goal.currentPhase!.position && phase.position <= draftPlan.endingPhasePosition)
      .reduce((total, phase) => total + phase.durationDays, 0);
    const plan = calculateRoadmapPlan(
      goal.currentScore ?? goal.targetScore,
      targetScore,
      dailyMinutes,
      goal.studyDays.length,
      requiredStudyDays,
      goal.newWordsPerDay,
    );
    const endingPhase = goal.course.phases.find((phase) => phase.position === plan.endingPhasePosition);
    if (!endingPhase) throw new NotFoundException('Không tìm thấy Phase kết thúc tương ứng.');

    return this.prisma.learningGoal.update({
      where: { userId },
      data: {
        targetScore,
        targetTrack: plan.track,
        endingPhasePosition: endingPhase.position,
        estimatedWeeks: plan.estimatedWeeks,
        dailyMinutes,
        goalAchievedAt: null,
      },
      include: { currentPhase: true, course: true },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        learningGoal: { select: { currentScore: true, targetScore: true } },
        progress: { select: { totalXp: true, streakCount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng.');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive, refreshTokenHash: isActive ? undefined : null },
      select: { id: true, email: true, displayName: true, isActive: true },
    });
  }
}
