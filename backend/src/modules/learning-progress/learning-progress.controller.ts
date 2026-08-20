import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SubmitMiniPracticeDto, UpdateActivityProgressDto } from './dto/learning-progress.dto';
import { LearningProgressService } from './learning-progress.service';

@ApiTags('Lesson Learning Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('learning/lessons')
export class LearningProgressController {
  constructor(private readonly learningProgressService: LearningProgressService) {}

  @Get(':lessonId/progress')
  progress(@CurrentUser() user: AuthUser, @Param('lessonId') lessonId: string) {
    return this.learningProgressService.getProgress(user.id, user.role, lessonId);
  }

  @Patch(':lessonId/activities/:activityIndex')
  updateActivity(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
    @Param('activityIndex', ParseIntPipe) activityIndex: number,
    @Body() input: UpdateActivityProgressDto,
  ) {
    return this.learningProgressService.updateActivity(user.id, user.role, lessonId, activityIndex, input.completed);
  }

  @Post(':lessonId/practice-attempts')
  submitPractice(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
    @Body() input: SubmitMiniPracticeDto,
  ) {
    return this.learningProgressService.submitPractice(user.id, user.role, lessonId, input.selectedAnswers);
  }
}
