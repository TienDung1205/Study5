import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CandidateLessonDto {
  @ApiProperty({ example: 'lesson-part-7-email' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'Đọc hiểu email công việc' })
  @IsString()
  title: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(5)
  @Max(180)
  durationMinutes: number;

  @ApiProperty({ example: 'READING' })
  @IsIn(['VOCABULARY', 'GRAMMAR', 'LISTENING', 'READING', 'REVIEW'])
  skill: string;
}

export class CreateDailyRecommendationDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  currentPhase: number;

  @ApiProperty({ example: 800 })
  @IsInt()
  @Min(10)
  @Max(990)
  targetScore: number;

  @ApiProperty({ example: 0.75 })
  @IsNumber()
  @Min(0)
  @Max(1)
  completionRate: number;

  @ApiProperty({ example: 65 })
  @IsInt()
  @Min(0)
  @Max(600)
  studyMinutes: number;

  @ApiProperty({ example: ['Part 5', 'Part 7'] })
  @IsArray()
  @IsString({ each: true })
  weakParts: string[];

  @ApiProperty({ example: 'tired', required: false })
  @IsOptional()
  @IsIn(['great', 'normal', 'tired'])
  mood?: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(20)
  @Max(180)
  tomorrowAvailableMinutes: number;

  @ApiProperty({ type: [CandidateLessonDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateLessonDto)
  candidateLessons: CandidateLessonDto[];
}

