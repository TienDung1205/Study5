import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ResourceType, SkillType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExternalResourceDto {
  @IsString() @MaxLength(160)
  name: string;
  @IsUrl()
  url: string;
  @IsString() @MaxLength(100)
  provider: string;
  @IsEnum(ResourceType)
  resourceType: ResourceType;
  @IsOptional() @IsEnum(SkillType)
  skill?: SkillType;
  @IsInt() @Min(5) @Max(300)
  estimatedMinutes: number;
  @IsOptional() @IsBoolean()
  requiresLogin?: boolean;
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateExternalResourceDto extends PartialType(CreateExternalResourceDto) {}

export class CreateExternalSubmissionDto {
  @IsString()
  assignmentItemId: string;
  @IsString()
  resourceId: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(495)
  listeningScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(5) @Max(495)
  readingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(10) @Max(990)
  totalScore?: number;
  @ApiPropertyOptional({ enum: ['PART_1', 'PART_2', 'PART_3', 'PART_4', 'PART_5', 'PART_6', 'PART_7', 'FULL_TEST'] })
  @IsOptional() @IsIn(['PART_1', 'PART_2', 'PART_3', 'PART_4', 'PART_5', 'PART_6', 'PART_7', 'FULL_TEST'])
  toeicPart?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(200)
  correctAnswers?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(200)
  totalQuestions?: number;
  @IsOptional() @IsInt() @Min(1) @Max(300)
  completionMinutes?: number;
  @IsArray() @IsString({ each: true })
  weakParts: string[];
  @IsOptional() @IsUrl()
  evidenceUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000)
  learnerNote?: string;
}
