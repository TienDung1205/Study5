import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateLearningGoalDto } from './dto/update-learning-goal.dto';

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
    if (studyDays?.some((day) => day < 0 || day > 6)) {
      throw new NotFoundException('Ngày học phải nằm trong khoảng 0-6.');
    }
    return this.prisma.learningGoal.upsert({
      where: { userId },
      update: {
        ...input,
        studyDays,
        examDate: input.examDate ? new Date(input.examDate) : undefined,
      },
      create: {
        userId,
        ...input,
        studyDays,
        examDate: input.examDate ? new Date(input.examDate) : undefined,
      },
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

