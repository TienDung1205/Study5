import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanType } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GenerateTodayDto {
  @ApiPropertyOptional({ enum: PlanType, default: PlanType.STANDARD })
  @IsOptional()
  @IsEnum(PlanType)
  planType?: PlanType;
}

export class SelectPlanDto {
  @IsEnum(PlanType)
  planType: PlanType;
}

export class RescheduleAssignmentDto {
  @IsDateString()
  scheduledDate: string;
}

export class FinishStudySessionDto {
  @IsInt()
  @Min(1)
  @Max(86_400)
  durationSeconds: number;
}

export class UpsertJournalDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsIn(['great', 'normal', 'tired'])
  mood?: string;
}

