import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, Max, Min } from 'class-validator';

export class UpdateActivityProgressDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  completed: boolean;
}

export class SubmitMiniPracticeDto {
  @ApiProperty({ example: [1, 0] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(9, { each: true })
  selectedAnswers: number[];
}
