import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AssignmentsService } from './assignments.service';
import {
  FinishStudySessionDto,
  GenerateTodayDto,
  RescheduleAssignmentDto,
  SelectPlanDto,
  UpsertJournalDto,
} from './dto/assignment.dto';

@ApiTags('Daily Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('today')
  getToday(@CurrentUser() user: AuthUser) {
    return this.assignmentsService.getToday(user.id);
  }

  @Get('recent')
  recent(@CurrentUser() user: AuthUser) {
    return this.assignmentsService.getRecent(user.id);
  }

  @Post('today/generate')
  generateToday(@CurrentUser() user: AuthUser, @Body() input: GenerateTodayDto) {
    return this.assignmentsService.generateToday(user.id, input.planType);
  }

  @Get('next-study-day')
  getNextStudyDay(@CurrentUser() user: AuthUser) {
    return this.assignmentsService.getNextStudyAssignment(user.id);
  }

  @Patch(':id/select-plan')
  selectPlan(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: SelectPlanDto) {
    return this.assignmentsService.selectPlan(user.id, id, input.planType);
  }

  @Post('items/:id/start')
  startItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assignmentsService.startItem(user.id, id);
  }

  @Post('items/:id/complete')
  completeItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assignmentsService.completeItem(user.id, id);
  }

  @Patch(':id/reschedule')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: RescheduleAssignmentDto,
  ) {
    return this.assignmentsService.reschedule(user.id, id, input.scheduledDate);
  }

  @Post('study-sessions')
  startSession(@CurrentUser() user: AuthUser, @Body('assignmentItemId') assignmentItemId?: string) {
    return this.assignmentsService.startSession(user.id, assignmentItemId);
  }

  @Patch('study-sessions/:id/finish')
  finishSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: FinishStudySessionDto,
  ) {
    return this.assignmentsService.finishSession(user.id, id, input.durationSeconds);
  }

  @Post('journal')
  journal(@CurrentUser() user: AuthUser, @Body() input: UpsertJournalDto) {
    return this.assignmentsService.upsertJournal(user.id, input.content, input.mood);
  }
}
