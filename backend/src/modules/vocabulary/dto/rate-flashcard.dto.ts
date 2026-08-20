import { ApiProperty } from '@nestjs/swagger';
import { FlashcardRating } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class RateFlashcardDto {
  @ApiProperty({ example: 'appointment' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  term: string;

  @ApiProperty({ enum: FlashcardRating, example: FlashcardRating.GOOD })
  @IsEnum(FlashcardRating)
  rating: FlashcardRating;
}
