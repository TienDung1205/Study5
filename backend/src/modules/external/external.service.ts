import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AssignmentsService } from '../assignments/assignments.service';
import {
  CreateExternalResourceDto,
  CreateExternalSubmissionDto,
  UpdateExternalResourceDto,
} from './dto/external.dto';

@Injectable()
export class ExternalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentsService: AssignmentsService,
  ) {}

  listActive() {
    return this.prisma.externalResource.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listAll() {
    return this.prisma.externalResource.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createResource(input: CreateExternalResourceDto) {
    return this.prisma.externalResource.create({ data: input });
  }

  updateResource(id: string, input: UpdateExternalResourceDto) {
    return this.prisma.externalResource.update({ where: { id }, data: input });
  }

  addToToday(userId: string, resourceId: string) {
    return this.assignmentsService.addExternalResourceToToday(userId, resourceId);
  }

  async submit(userId: string, input: CreateExternalSubmissionDto) {
    const item = await this.prisma.assignmentItem.findFirst({
      where: { id: input.assignmentItemId, assignment: { userId } },
    });
    if (!item) throw new NotFoundException('Không tìm thấy nhiệm vụ bên ngoài.');
    if (item.externalResourceId !== input.resourceId) {
      throw new BadRequestException('Nguồn nộp kết quả không khớp với nhiệm vụ.');
    }
    if (!input.totalScore && input.listeningScore && input.readingScore) {
      input.totalScore = input.listeningScore + input.readingScore;
    }
    if (input.toeicPart === 'FULL_TEST' && !input.totalScore) {
      throw new BadRequestException('Checkpoint Full test cần nhập đủ điểm Listening và Reading.');
    }
    if ((input.correctAnswers === undefined) !== (input.totalQuestions === undefined)) {
      throw new BadRequestException('Cần nhập cả số câu đúng và tổng số câu.');
    }
    if (input.correctAnswers !== undefined && input.totalQuestions !== undefined && input.correctAnswers > input.totalQuestions) {
      throw new BadRequestException('Số câu đúng không thể lớn hơn tổng số câu.');
    }
    const accuracy = input.correctAnswers !== undefined && input.totalQuestions
      ? input.correctAnswers / input.totalQuestions
      : undefined;
    const submission = await this.prisma.externalSubmission.upsert({
      where: { assignmentItemId: input.assignmentItemId },
      update: { ...input, accuracy, userId },
      create: { ...input, accuracy, userId },
    });
    let goalStatus: { achieved: boolean; currentScore: number | null; targetScore: number; canUpgradeTargets: number[] } | null = null;
    if (input.toeicPart === 'FULL_TEST' && input.totalScore) {
      const goal = await this.prisma.learningGoal.findUnique({ where: { userId } });
      if (goal) {
        const achieved = input.totalScore >= goal.targetScore;
        const newlyAchieved = achieved && !goal.goalAchievedAt;
        const checkpointAt = new Date();
        await this.prisma.$transaction(async (transaction) => {
          await transaction.learningGoal.update({
            where: { userId },
            data: {
              currentScore: input.totalScore,
              lastCheckpointAt: checkpointAt,
              goalAchievedAt: achieved ? (goal.goalAchievedAt ?? checkpointAt) : undefined,
            },
          });
          if (newlyAchieved) {
            await transaction.notification.create({
              data: {
                userId,
                type: NotificationType.ACHIEVEMENT,
                title: `Đã đạt mục tiêu TOEIC ${goal.targetScore}`,
                message: `Checkpoint mới nhất đạt ${input.totalScore} điểm. Bạn có thể kết thúc hoặc nâng mục tiêu.`,
              },
            });
          }
        });
        goalStatus = {
          achieved,
          currentScore: input.totalScore,
          targetScore: goal.targetScore,
          canUpgradeTargets: [450, 600, 700, 800].filter((score) => score > goal.targetScore),
        };
      }
    }
    const assignment = await this.assignmentsService.completeItem(userId, input.assignmentItemId);
    return { submission, assignment, goalStatus };
  }

  history(userId: string) {
    return this.prisma.externalSubmission.findMany({
      where: { userId },
      include: { resource: true, assignmentItem: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
