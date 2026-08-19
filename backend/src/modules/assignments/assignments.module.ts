import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsScheduler } from './assignments.scheduler';
import { AssignmentsService } from './assignments.service';

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentsScheduler],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}

