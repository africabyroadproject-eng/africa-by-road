import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminTokenPayload } from '../../common/interfaces/token-payload.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { parsePaginationValue } from '../../common/utils/pagination';
import { AdminVotingService } from './admin-voting.service';
import { EliminateContestantDto } from './dto/eliminate-contestant.dto';
import { StartCycleDto } from './dto/start-cycle.dto';
import { Request } from 'express';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the admin token payload from the request (set by AdminAuthGuard).
 */
const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminTokenPayload => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return req.admin!;
});

@ApiTags('Admin — Voting Management')
@Controller('admin/voting')
@ApiBearerAuth('bearerAuth')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('voting_manager')
export class AdminVotingController {
  constructor(private readonly adminVotingService: AdminVotingService) {}

  // ──────────────────────────────────────────────
  // GET /api/admin/voting/current
  // ──────────────────────────────────────────────
  @Get('current')
  @ApiOperation({ summary: 'Get current active voting cycle with contestant tallies' })
  async getCurrentCycle() {
    const data = await this.adminVotingService.getCurrentCycle();
    if (!data) {
      return { message: 'No active voting cycle', data: null };
    }
    return { message: 'Current voting cycle', data };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/voting/cycles
  // ──────────────────────────────────────────────
  @Get('cycles')
  @ApiOperation({ summary: 'List all voting cycles (paginated)' })
  async listCycles(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 20, 100);
    const result = await this.adminVotingService.listCycles(pageNum, limitNum);
    return { message: 'Voting cycles', ...result };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/voting/cycles/:id
  // ──────────────────────────────────────────────
  @Get('cycles/:id')
  @ApiOperation({ summary: 'Get specific voting cycle details with vote stats' })
  async getCycleDetail(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.adminVotingService.getCycleDetail(id);
    return { message: 'Voting cycle detail', data };
  }

  // ──────────────────────────────────────────────
  // POST /api/admin/voting/cycles
  // ──────────────────────────────────────────────
  @Post('cycles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new voting cycle (auto-closes any active cycle)' })
  async startNewCycle(@Body() dto: StartCycleDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminVotingService.startNewCycle(dto.name, admin.id);
    return { message: 'New voting cycle started', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/voting/cycles/:id/close
  // ──────────────────────────────────────────────
  @Patch('cycles/:id/close')
  @ApiOperation({ summary: 'Manually close a voting cycle' })
  async closeCycle(@Param('id', ParseObjectIdPipe) id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminVotingService.closeCycle(id, admin.id);
    return { message: 'Voting cycle closed', data };
  }

  // ──────────────────────────────────────────────
  // POST /api/admin/voting/eliminate
  // ──────────────────────────────────────────────
  @Post('eliminate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminate a contestant from the current voting cycle' })
  async eliminateContestant(@Body() dto: EliminateContestantDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminVotingService.eliminateContestant(dto.contestantId, dto.reason, admin.id);
    return { message: 'Contestant eliminated', data };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/voting/contestants/:id/history
  // ──────────────────────────────────────────────
  @Get('contestants/:id/history')
  @ApiOperation({ summary: 'Vote history for a specific contestant across all cycles' })
  async getContestantVoteHistory(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.adminVotingService.getContestantVoteHistory(id);
    return { message: 'Contestant vote history', data };
  }
}
