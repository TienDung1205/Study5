import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CompleteOnboardingDto {
  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(10)
  @Max(985)
  currentScore: number;

  @ApiProperty({ example: 800 })
  @IsInt()
  @Min(50)
  @Max(990)
  targetScore: number;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(20)
  @Max(180)
  dailyMinutes: number;

  @ApiProperty({ example: [1, 2, 3, 4, 5, 6] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  studyDays: number[];

  @ApiPropertyOptional({ example: '2027-01-15' })
  @IsOptional()
  @IsDateString()
  examDate?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  preferredHour?: number;
}
