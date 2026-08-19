import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateDailyRecommendationDto } from './dto/create-daily-recommendation.dto';
import { DailyRecommendation } from './ai-coach.types';

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(private readonly configService: ConfigService) {}

  async generate(input: CreateDailyRecommendationDto): Promise<DailyRecommendation | null> {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    const model = this.configService.get<string>('AI_MODEL');
    if (!apiKey || !model) return null;

    const baseUrl = this.configService.get<string>('AI_BASE_URL', 'https://api.openai.com/v1');
    const timeoutMs = this.configService.get<number>('AI_TIMEOUT_MS', 15_000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content:
                'Bạn là TOEIC Daily Coach. Chỉ chọn lessonId được cung cấp. Trả về JSON thuần có analysis và đúng 3 plans: recovery, standard, accelerated.',
            },
            { role: 'user', content: JSON.stringify(input) },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn(`AI provider returned HTTP ${response.status}.`);
        return null;
      }
      const data = (await response.json()) as { output_text?: string };
      if (!data.output_text) return null;
      return JSON.parse(data.output_text.replace(/^```json\s*|\s*```$/g, '')) as DailyRecommendation;
    } catch (error) {
      this.logger.warn(`AI provider failed, using fallback: ${error instanceof Error ? error.message : 'unknown error'}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

