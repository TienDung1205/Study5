import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../../common/auth/auth-user.interface';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateLearningGoalDto } from './dto/update-learning-goal.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  @Put('me/learning-goal')
  updateGoal(@CurrentUser() user: AuthUser, @Body() input: UpdateLearningGoalDto) {
    return this.usersService.updateLearningGoal(user.id, input);
  }

  @Put('me/onboarding')
  completeOnboarding(@CurrentUser() user: AuthUser, @Body() input: CompleteOnboardingDto) {
    return this.usersService.completeOnboarding(user.id, input);
  }
}

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.listUsers();
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() input: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, input.isActive);
  }
}
