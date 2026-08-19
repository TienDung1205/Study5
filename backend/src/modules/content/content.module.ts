import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminContentController, ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AuthModule],
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}

