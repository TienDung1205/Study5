import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ContentService } from '../content/content.service';

interface LessonActivityData {
  title: string;
  minutes: number;
  instructions: string[];
}

interface PracticeQuestionData {
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface LessonContentData {
  activities?: LessonActivityData[];
  practice?: { questions?: PracticeQuestionData[] };
}

@Injectable()
export class LearningProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
  ) {}

  async getProgress(userId: string, role: UserRole, lessonId: string) {
    await this.contentService.getLesson(userId, lessonId, role);
    const [activities, latestPracticeAttempt] = await Promise.all([
      this.prisma.lessonActivityProgress.findMany({
        where: { userId, lessonId },
        orderBy: { activityIndex: 'asc' },
        select: { activityIndex: true, completedAt: true },
      }),
      this.prisma.miniPracticeAttempt.findFirst({
        where: { userId, lessonId },
        orderBy: { submittedAt: 'desc' },
        select: {
          id: true,
          selectedAnswers: true,
          correctAnswers: true,
          totalQuestions: true,
          accuracy: true,
          resultDetails: true,
          submittedAt: true,
        },
      }),
    ]);
    return { completedActivityIndexes: activities.map((item) => item.activityIndex), latestPracticeAttempt };
  }

  async updateActivity(userId: string, role: UserRole, lessonId: string, activityIndex: number, completed: boolean) {
    if (role !== UserRole.LEARNER) throw new ForbiddenException('Chỉ học viên mới cập nhật tiến độ học.');
    const lesson = await this.contentService.getLesson(userId, lessonId, role);
    const activities = this.readContentData(lesson.contentData).activities ?? [];
    if (activityIndex < 0 || activityIndex >= activities.length) {
      throw new BadRequestException('Hoạt động không tồn tại trong bài học.');
    }
    if (!completed) {
      await this.prisma.lessonActivityProgress.deleteMany({ where: { userId, lessonId, activityIndex } });
    } else {
      await this.prisma.lessonActivityProgress.upsert({
        where: { userId_lessonId_activityIndex: { userId, lessonId, activityIndex } },
        update: { completedAt: new Date() },
        create: { userId, lessonId, activityIndex },
      });
    }
    return this.getProgress(userId, role, lessonId);
  }

  async submitPractice(userId: string, role: UserRole, lessonId: string, selectedAnswers: number[]) {
    if (role !== UserRole.LEARNER) throw new ForbiddenException('Chỉ học viên mới nộp kết quả luyện tập.');
    const lesson = await this.contentService.getLesson(userId, lessonId, role);
    const questions = this.readContentData(lesson.contentData).practice?.questions ?? [];
    if (!questions.length) throw new BadRequestException('Bài học chưa có câu hỏi mini practice.');
    if (selectedAnswers.length !== questions.length) {
      throw new BadRequestException(`Cần trả lời đủ ${questions.length} câu hỏi.`);
    }
    const details = questions.map((question, questionIndex) => {
      const selectedOptionIndex = selectedAnswers[questionIndex];
      if (selectedOptionIndex >= question.options.length) {
        throw new BadRequestException(`Đáp án câu ${questionIndex + 1} không hợp lệ.`);
      }
      return {
        questionIndex,
        selectedOptionIndex,
        correctOptionIndex: question.correctOptionIndex,
        correct: selectedOptionIndex === question.correctOptionIndex,
        explanation: question.explanation,
      };
    });
    const correctAnswers = details.filter((detail) => detail.correct).length;
    return this.prisma.miniPracticeAttempt.create({
      data: {
        userId,
        lessonId,
        selectedAnswers,
        correctAnswers,
        totalQuestions: questions.length,
        accuracy: correctAnswers / questions.length,
        resultDetails: JSON.parse(JSON.stringify(details)) as Prisma.InputJsonValue,
      },
    });
  }

  private readContentData(value: Prisma.JsonValue | null): LessonContentData {
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return value as unknown as LessonContentData;
  }
}
