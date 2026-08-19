import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateLearningGoalDto {
  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(990)
  currentScore?: number;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(990)
  targetScore?: number;

  @ApiPropertyOptional({ example: '2027-01-15' })
  @IsOptional()
  @IsDateString()
  examDate?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(180)
  dailyMinutes?: number;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5, 6] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  studyDays?: number[];

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  preferredHour?: number;
}

