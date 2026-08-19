import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { isNextScheduledStudyDay } from '../../common/learning/learning-rules';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async awardXp(userId: string, amount: number, reason: string, sourceId: string) {
    try {
      const progress = await this.prisma.$transaction(async (tx) => {
        await tx.xpTransaction.create({ data: { userId, amount, reason, sourceId } });
        const updated = await tx.learnerProgress.upsert({
          where: { userId },
          update: { totalXp: { increment: amount } },
          create: { userId, totalXp: amount },
        });
        const level = Math.floor(updated.totalXp / 500) + 1;
        return tx.learnerProgress.update({ where: { userId }, data: { level } });
      });
      return { awarded: true, progress };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return { awarded: false, progress: await this.getSummary(userId) };
      }
      throw error;
    }
  }

  async recordCompletedDay(userId: string, completedAt: Date) {
    const [progress, goal] = await Promise.all([
      this.prisma.learnerProgress.upsert({ where: { userId }, update: {}, create: { userId } }),
      this.prisma.learningGoal.findUnique({
        where: { userId },
        include: { user: { select: { timezone: true } } },
      }),
    ]);
    const completedDate = this.toUtcDate(completedAt);
    const lastDate = progress.lastCompletedDate ? this.toUtcDate(progress.lastCompletedDate) : null;
    if (lastDate?.getTime() === completedDate.getTime()) return progress;

    const followsSchedule = lastDate && goal
      ? isNextScheduledStudyDay(lastDate, completedDate, goal.studyDays, goal.user.timezone)
      : false;
    const streakCount = followsSchedule ? progress.streakCount + 1 : 1;
    const updated = await this.prisma.learnerProgress.update({
      where: { userId },
      data: {
        streakCount,
        longestStreak: Math.max(progress.longestStreak, streakCount),
        lastCompletedDate: completedDate,
      },
    });

    await this.awardBadge(userId, 'FIRST_WIN');
    if (streakCount >= 3) await this.awardBadge(userId, 'THREE_DAY_STREAK');
    return updated;
  }

  getSummary(userId: string) {
    return this.prisma.learnerProgress.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            badges: { include: { badge: true }, orderBy: { earnedAt: 'desc' } },
          },
        },
      },
    });
  }

  async awardBadge(userId: string, badgeCode: string): Promise<void> {
    const badge = await this.prisma.badge.findUnique({ where: { code: badgeCode } });
    if (!badge) return;
    const existing = await this.prisma.learnerBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (existing) return;
    await this.prisma.$transaction([
      this.prisma.learnerBadge.create({ data: { userId, badgeId: badge.id } }),
      this.prisma.notification.create({
        data: {
          userId,
          type: NotificationType.ACHIEVEMENT,
          title: `Huy hiệu mới: ${badge.name}`,
          message: badge.description,
        },
      }),
    ]);
  }

  private toUtcDate(value: Date): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

}
