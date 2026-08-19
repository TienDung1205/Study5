import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../common/auth/auth-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { ContentService } from './content.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreatePhaseDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdatePhaseDto,
} from './dto/content.dto';

@ApiTags('Learning Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('roadmap')
  roadmap(@CurrentUser() user: AuthUser) {
    return this.contentService.getRoadmap(user.id);
  }

  @Get('lessons/:id')
  lesson(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.contentService.getLesson(user.id, id);
  }
}

@ApiTags('Admin Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  list() { return this.contentService.listAdmin(); }
  @Post('courses')
  createCourse(@Body() input: CreateCourseDto) { return this.contentService.createCourse(input); }
  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() input: UpdateCourseDto) { return this.contentService.updateCourse(id, input); }
  @Post('phases')
  createPhase(@Body() input: CreatePhaseDto) { return this.contentService.createPhase(input); }
  @Patch('phases/:id')
  updatePhase(@Param('id') id: string, @Body() input: UpdatePhaseDto) { return this.contentService.updatePhase(id, input); }
  @Post('lessons')
  createLesson(@Body() input: CreateLessonDto) { return this.contentService.createLesson(input); }
  @Patch('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() input: UpdateLessonDto) { return this.contentService.updateLesson(id, input); }
  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) { return this.contentService.deleteLesson(id); }
}

