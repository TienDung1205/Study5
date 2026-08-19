import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AssignmentsService } from './assignments.service';

@Injectable()
export class AssignmentsScheduler {
  private readonly logger = new Logger(AssignmentsScheduler.name);

  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async markOverdue(): Promise<void> {
    const count = await this.assignmentsService.markOverdueAssignments();
    if (count > 0) this.logger.log(`Marked ${count} assignments as overdue.`);
  }
}

