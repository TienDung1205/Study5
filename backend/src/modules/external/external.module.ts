import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { AuthModule } from '../auth/auth.module';
import { AdminExternalController, ExternalController } from './external.controller';
import { ExternalService } from './external.service';

@Module({
  imports: [AuthModule, AssignmentsModule],
  controllers: [ExternalController, AdminExternalController],
  providers: [ExternalService],
})
export class ExternalModule {}

