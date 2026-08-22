import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(10)
  @Max(985)
  currentScore: number;

  @ApiProperty({ example: 800 })
  @IsInt()
  @IsIn([450, 600, 700, 800])
  targetScore: number;

  @ApiProperty({ example: [1, 2, 3, 4, 5, 6] })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  studyDays: number[];

  @ApiPropertyOptional({ example: '2027-01-15' })
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày dự thi phải có định dạng YYYY-MM-DD với năm gồm 4 chữ số.' })
  examDate?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  preferredHour?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(59)
  preferredMinute?: number;
}
