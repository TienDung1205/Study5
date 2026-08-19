import { PlanType } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DailyAnalysisDto {
  @IsOptional()
  @IsIn(['great', 'normal', 'tired'])
  mood?: string;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(180)
  tomorrowAvailableMinutes?: number;
}

export class SelectRecommendationDto {
  @IsEnum(PlanType)
  planType: PlanType;
}

