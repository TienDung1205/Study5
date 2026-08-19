import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ResourceType, SkillType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsString() @MinLength(3) @MaxLength(120)
  title: string;
  @IsString() @MinLength(3) @MaxLength(120)
  slug: string;
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;
  @IsInt() @Min(10) @Max(990)
  targetScore: number;
  @IsInt() @Min(1) @Max(104)
  durationWeeks: number;
  @IsOptional() @IsBoolean()
  isPublished?: boolean;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CreatePhaseDto {
  @ApiProperty()
  @IsString()
  courseId: string;
  @IsString() @MinLength(3) @MaxLength(120)
  title: string;
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;
  @IsInt() @Min(1)
  position: number;
  @IsInt() @Min(1) @Max(365)
  durationDays: number;
  @IsOptional() @IsNumber() @Min(0.5) @Max(1)
  requiredRate?: number;
}

export class UpdatePhaseDto extends PartialType(CreatePhaseDto) {}

export class CreateLessonDto {
  @IsString()
  phaseId: string;
  @IsString() @MinLength(3) @MaxLength(160)
  title: string;
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;
  @IsEnum(SkillType)
  skill: SkillType;
  @IsEnum(ResourceType)
  resourceType: ResourceType;
  @IsOptional() @IsString()
  content?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  contentUrl?: string;
  @IsInt() @Min(5) @Max(240)
  durationMinutes: number;
  @IsInt() @Min(0) @Max(500)
  xpReward: number;
  @IsInt() @Min(1)
  position: number;
  @IsOptional() @IsBoolean()
  isPublished?: boolean;
}

export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

