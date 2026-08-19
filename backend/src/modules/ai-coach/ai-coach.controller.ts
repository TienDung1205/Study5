import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AiDailyService } from './ai-daily.service';
import { AiCoachService } from './ai-coach.service';
import { CreateDailyRecommendationDto } from './dto/create-daily-recommendation.dto';
import { DailyAnalysisDto, SelectRecommendationDto } from './dto/daily-analysis.dto';

@ApiTags('AI Coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-coach')
export class AiCoachController {
  constructor(
    private readonly aiCoachService: AiCoachService,
    private readonly aiDailyService: AiDailyService,
  ) {}

  @Post('recommendations/preview')
  @ApiCreatedResponse({ description: 'Ba kế hoạch fallback hợp lệ cho ngày tiếp theo.' })
  createPreview(@Body() input: CreateDailyRecommendationDto) {
    return this.aiCoachService.createFallbackRecommendation(input);
  }

  @Post('daily-analysis')
  analyze(@CurrentUser() user: AuthUser, @Body() input: DailyAnalysisDto) {
    return this.aiDailyService.analyze(user.id, input);
  }

  @Get('recommendations/latest')
  latest(@CurrentUser() user: AuthUser) {
    return this.aiDailyService.latest(user.id);
  }

  @Post('recommendations/:id/select')
  select(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() input: SelectRecommendationDto,
  ) {
    return this.aiDailyService.select(user.id, id, input.planType);
  }
}
