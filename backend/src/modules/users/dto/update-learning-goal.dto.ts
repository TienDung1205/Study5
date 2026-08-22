import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class UpdateLearningGoalDto {
  @ApiPropertyOptional({ example: 700, enum: [450, 600, 700, 800] })
  @IsOptional()
  @IsInt()
  @IsIn([450, 600, 700, 800])
  targetScore?: number;

  @ApiPropertyOptional({ example: 10, enum: [5, 10, 15, 20, 25, 30] })
  @IsOptional()
  @IsInt()
  @IsIn([5, 10, 15, 20, 25, 30])
  newWordsPerDay?: number;

  @ApiPropertyOptional({ example: '2027-01-15', nullable: true })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày dự thi phải có định dạng YYYY-MM-DD với năm gồm 4 chữ số.' })
  examDate?: string | null;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5, 6] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  studyDays?: number[];

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  preferredHour?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  preferredMinute?: number;
}
