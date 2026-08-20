import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { LearningProgressController } from './learning-progress.controller';
import { LearningProgressService } from './learning-progress.service';

@Module({
  imports: [AuthModule, ContentModule],
  controllers: [LearningProgressController],
  providers: [LearningProgressService],
  exports: [LearningProgressService],
})
export class LearningProgressModule {}
