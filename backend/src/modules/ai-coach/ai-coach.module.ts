import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { AuthModule } from '../auth/auth.module';
import { AiCoachController } from './ai-coach.controller';
import { AiDailyService } from './ai-daily.service';
import { AiProviderService } from './ai-provider.service';
import { AiCoachService } from './ai-coach.service';

@Module({
  imports: [AuthModule, AssignmentsModule],
  controllers: [AiCoachController],
  providers: [AiCoachService, AiDailyService, AiProviderService],
  exports: [AiCoachService],
})
export class AiCoachModule {}
