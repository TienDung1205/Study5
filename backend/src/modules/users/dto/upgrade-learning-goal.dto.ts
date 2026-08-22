import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';

export class UpgradeLearningGoalDto {
  @ApiProperty({ example: 800, enum: [450, 600, 700, 800] })
  @IsInt()
  @IsIn([450, 600, 700, 800])
  targetScore: number;
}
