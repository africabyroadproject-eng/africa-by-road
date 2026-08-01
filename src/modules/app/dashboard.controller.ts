import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegistrationGuard } from '../../common/guards/registration.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('App')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RegistrationGuard)
@Controller('app')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Fetch user dashboard with registration progress' })
  async getDashboard(@CurrentUser() user: TokenPayload) {
    const data = await this.dashboardService.getDashboard(user.id);
    return { message: 'Dashboard retrieved successfully', data };
  }
}
