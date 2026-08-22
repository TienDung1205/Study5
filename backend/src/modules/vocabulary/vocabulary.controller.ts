import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RateFlashcardDto } from './dto/rate-flashcard.dto';
import { VocabularyService } from './vocabulary.service';

@ApiTags('Vocabulary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  @Post('reviews')
  rateCard(@CurrentUser() user: AuthUser, @Body() input: RateFlashcardDto) {
    return this.vocabularyService.rateCard(user.id, input);
  }

  @Get('reviews/due')
  getDueCards(@CurrentUser() user: AuthUser) {
    return this.vocabularyService.getDueCards(user.id);
  }

  @Get('decks/:assignmentId')
  getDailyDeck(@CurrentUser() user: AuthUser, @Param('assignmentId') assignmentId: string) {
    return this.vocabularyService.getDailyDeck(user.id, assignmentId);
  }
}
