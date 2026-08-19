import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    const assignment = await this.assignmentsService.completeItem(userId, input.assignmentItemId);
    return { submission, assignment };
  }

  history(userId: string) {
    return this.prisma.externalSubmission.findMany({
      where: { userId },
      include: { resource: true, assignmentItem: { select: { title: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
