import { Injectable } from '@nestjs/common';
import { AssignmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MASTERY_THRESHOLD } from '../../common/learning/learning-rules';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async weekly(userId: string) {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 6);
    from.setUTCHours(0, 0, 0, 0);
    const [assignments, studyAggregate, submissions, progress, practiceAttempts] = await Promise.all([
      this.prisma.dailyAssignment.findMany({
        where: { userId, scheduledDate: { gte: from } },
        include: { items: true },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.studySession.aggregate({
        where: { userId, startedAt: { gte: from } },
        _sum: { durationSeconds: true },
      }),
      this.prisma.externalSubmission.findMany({
        where: { userId, submittedAt: { gte: from } },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.learnerProgress.findUnique({ where: { userId } }),
      this.prisma.miniPracticeAttempt.findMany({
        where: { userId, submittedAt: { gte: from } },
        include: { lesson: { select: { title: true, skill: true } } },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);
    const totalItems = assignments.reduce((sum, assignment) => sum + assignment.items.length, 0);
    const completedItems = assignments.reduce(
      (sum, assignment) => sum + assignment.items.filter((item) => item.completedAt).length,
      0,
    );
    const latestByPart = new Map<string, (typeof submissions)[number]>();
    for (const submission of submissions) {
      if (submission.toeicPart && !latestByPart.has(submission.toeicPart)) {
        latestByPart.set(submission.toeicPart, submission);
      }
    }
    const practiceCorrectAnswers = practiceAttempts.reduce((sum, attempt) => sum + attempt.correctAnswers, 0);
    const practiceTotalQuestions = practiceAttempts.reduce((sum, attempt) => sum + attempt.totalQuestions, 0);
    const practiceBySkillMap = new Map<string, { correctAnswers: number; totalQuestions: number; attempts: number }>();
    for (const attempt of practiceAttempts) {
      const current = practiceBySkillMap.get(attempt.lesson.skill) ?? { correctAnswers: 0, totalQuestions: 0, attempts: 0 };
      current.correctAnswers += attempt.correctAnswers;
      current.totalQuestions += attempt.totalQuestions;
      current.attempts += 1;
      practiceBySkillMap.set(attempt.lesson.skill, current);
    }
    return {
      from,
      completedDays: assignments.filter((assignment) => assignment.status === AssignmentStatus.COMPLETED).length,
      scheduledDays: assignments.length,
      completedItems,
      totalItems,
      completionRate: totalItems ? completedItems / totalItems : 0,
      studyMinutes: Math.round((studyAggregate._sum.durationSeconds ?? 0) / 60),
      latestScore: submissions[0]?.totalScore ?? null,
      practiceAttempts: practiceAttempts.length,
      practiceCorrectAnswers,
      practiceTotalQuestions,
      practiceAccuracy: practiceTotalQuestions ? practiceCorrectAnswers / practiceTotalQuestions : null,
      practiceBySkill: Array.from(practiceBySkillMap.entries()).map(([skill, values]) => ({
        skill,
        ...values,
        accuracy: values.totalQuestions ? values.correctAnswers / values.totalQuestions : null,
      })),
      recentPracticeAttempts: practiceAttempts.slice(0, 5).map((attempt) => ({
        id: attempt.id,
        lessonTitle: attempt.lesson.title,
        skill: attempt.lesson.skill,
        correctAnswers: attempt.correctAnswers,
        totalQuestions: attempt.totalQuestions,
        accuracy: attempt.accuracy,
        submittedAt: attempt.submittedAt,
      })),
      partMastery: Array.from(latestByPart.values()).map((submission) => ({
        part: submission.toeicPart,
        accuracy: submission.accuracy,
        correctAnswers: submission.correctAnswers,
        totalQuestions: submission.totalQuestions,
        mastered: (submission.accuracy ?? 0) >= MASTERY_THRESHOLD,
      })),
      streakCount: progress?.streakCount ?? 0,
      totalXp: progress?.totalXp ?? 0,
      daily: assignments.map((assignment) => ({
        date: assignment.scheduledDate,
        status: assignment.status,
        completed: assignment.items.filter((item) => item.completedAt).length,
        total: assignment.items.length,
      })),
    };
  }

  async adminDashboard() {
    const [learners, activeLearners, courses, assignments, completedAssignments, externalSubmissions] =
      await Promise.all([
        this.prisma.user.count({ where: { role: UserRole.LEARNER } }),
        this.prisma.user.count({ where: { role: UserRole.LEARNER, isActive: true } }),
        this.prisma.course.count(),
        this.prisma.dailyAssignment.count(),
        this.prisma.dailyAssignment.count({ where: { status: AssignmentStatus.COMPLETED } }),
        this.prisma.externalSubmission.count(),
      ]);
    return {
      learners,
      activeLearners,
      courses,
      assignments,
      completedAssignments,
      externalSubmissions,
      completionRate: assignments ? completedAssignments / assignments : 0,
    };
  }

  async atRiskLearners() {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 3);
    return this.prisma.user.findMany({
      where: {
        role: UserRole.LEARNER,
        isActive: true,
        OR: [
          { progress: { lastCompletedDate: { lt: cutoff } } },
          { progress: { lastCompletedDate: null } },
          { assignments: { some: { status: AssignmentStatus.OVERDUE } } },
        ],
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        progress: true,
        _count: { select: { assignments: { where: { status: AssignmentStatus.OVERDUE } } } },
      },
    });
  }
}
