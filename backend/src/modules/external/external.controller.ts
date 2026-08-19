import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../common/auth/auth-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import {
  CreateExternalResourceDto,
  CreateExternalSubmissionDto,
  UpdateExternalResourceDto,
} from './dto/external.dto';
import { ExternalService } from './external.service';

@ApiTags('External Learning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('external')
export class ExternalController {
  constructor(private readonly externalService: ExternalService) {}
  @Get('resources')
  resources() { return this.externalService.listActive(); }
  @Get('submissions')
  history(@CurrentUser() user: AuthUser) { return this.externalService.history(user.id); }
  @Post('resources/:id/add-to-today')
  addToToday(@CurrentUser() user: AuthUser, @Param('id') resourceId: string) {
    return this.externalService.addToToday(user.id, resourceId);
  }
  @Post('submissions')
  submit(@CurrentUser() user: AuthUser, @Body() input: CreateExternalSubmissionDto) {
    return this.externalService.submit(user.id, input);
  }
}

@ApiTags('Admin External Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/external-resources')
export class AdminExternalController {
  constructor(private readonly externalService: ExternalService) {}
  @Get()
  list() { return this.externalService.listAll(); }
  @Post()
  create(@Body() input: CreateExternalResourceDto) { return this.externalService.createResource(input); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateExternalResourceDto) {
    return this.externalService.updateResource(id, input);
  }
}
