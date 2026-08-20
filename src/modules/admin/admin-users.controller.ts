import {
  Body,
  Controller,
  createParamDecorator,
  ExecutionContext,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminTokenPayload } from '../../common/interfaces/token-payload.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { parsePaginationValue } from '../../common/utils/pagination';
import { AdminUsersService } from './admin-users.service';
import { BlockUserDto } from './dto/block-user.dto';

/**
 * Extracts the admin token payload from the request (set by AdminAuthGuard).
 */
const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminTokenPayload => {
  const req = ctx.switchToHttp().getRequest();
  return (req as any).admin!;
});

@ApiTags('Admin — User Management')
@Controller('admin/users')
@ApiBearerAuth('bearerAuth')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('user_manager')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  // ──────────────────────────────────────────────
  // GET /api/admin/users
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all tourist users with filters, search, pagination, and summary card stats' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isPaid', required: false, type: Boolean })
  @ApiQuery({ name: 'isEmailVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'isBlocked', required: false, type: Boolean })
  @ApiQuery({ name: 'registrationStatus', required: false, enum: ['pending', 'in_progress', 'complete'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isPaid') isPaid?: string,
    @Query('isEmailVerified') isEmailVerified?: string,
    @Query('isBlocked') isBlocked?: string,
    @Query('registrationStatus') registrationStatus?: 'pending' | 'in_progress' | 'complete',
    @Query('search') search?: string,
  ) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 20, 100);

    const isPaidBool = isPaid !== undefined ? isPaid === 'true' : undefined;
    const isVerifiedBool = isEmailVerified !== undefined ? isEmailVerified === 'true' : undefined;
    const isBlockedBool = isBlocked !== undefined ? isBlocked === 'true' : undefined;

    const result = await this.adminUsersService.listUsers({
      page: pageNum,
      limit: limitNum,
      isPaid: isPaidBool,
      isEmailVerified: isVerifiedBool,
      isBlocked: isBlockedBool,
      registrationStatus,
      search,
    });

    return { message: 'Users list', ...result };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/users/stats
  // ──────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get overview summary statistics for user metrics' })
  async getUserStats() {
    const data = await this.adminUsersService.getUserStats();
    return { message: 'User statistics', data };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/users/:id
  // ──────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get full user profile details by ID' })
  async getUserDetail(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.adminUsersService.getUserDetail(id);
    return { message: 'User detail', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/users/:id/block
  // ──────────────────────────────────────────────
  @Patch(':id/block')
  @ApiOperation({ summary: 'Block or unblock a user account with reason logging' })
  async toggleBlockUser(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: BlockUserDto,
    @CurrentAdmin() admin: AdminTokenPayload,
  ) {
    const data = await this.adminUsersService.toggleBlockUser(id, dto, admin.id);
    return { message: `User ${dto.isBlocked ? 'blocked' : 'unblocked'} successfully`, data };
  }
}
