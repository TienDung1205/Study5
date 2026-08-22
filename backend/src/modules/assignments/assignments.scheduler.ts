import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class AssignmentsScheduler {
  private readonly logger = new Logger(AssignmentsScheduler.name);

  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async markOverdue(): Promise<void> {
    const overdueCount = await this.assignmentsService.markOverdueAssignments();
    if (overdueCount > 0) this.logger.log(`Marked ${overdueCount} assignments as overdue.`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async remindAtPreferredHour(): Promise<void> {
    const reminderCount = await this.assignmentsService.createPreferredHourReminders();
    if (reminderCount > 0) this.logger.log(`Created ${reminderCount} preferred-hour study reminders.`);
  }
}
