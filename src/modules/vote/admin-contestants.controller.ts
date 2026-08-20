import {
  Body,
  Controller,
  createParamDecorator,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
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
import { AdminContestantsService } from './admin-contestants.service';
import { CreateContestantDto } from './dto/create-contestant.dto';
import { MoveContestantStageDto, StageType } from './dto/move-contestant-stage.dto';
import { UpdateContestantDto } from './dto/update-contestant.dto';
import { ContestantStatusType, UpdateContestantStatusDto } from './dto/update-contestant-status.dto';

/**
 * Extracts the admin token payload from the request (set by AdminAuthGuard).
 */
const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminTokenPayload => {
  const req = ctx.switchToHttp().getRequest();
  return (req as any).admin!;
});

@ApiTags('Admin — Contestants Management')
@Controller('admin/contestants')
@ApiBearerAuth('bearerAuth')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('contestant_manager')
export class AdminContestantsController {
  constructor(private readonly adminContestantsService: AdminContestantsService) {}

  // ──────────────────────────────────────────────
  // GET /api/admin/contestants
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all contestants with filters, text search, pagination, and stage summary stats' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'stage', required: false, enum: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Final'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'active', 'eliminated', 'winner'] })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listContestants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stage') stage?: StageType,
    @Query('status') status?: ContestantStatusType,
    @Query('country') country?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 20, 100);
    const result = await this.adminContestantsService.listContestants({
      page: pageNum,
      limit: limitNum,
      stage,
      status,
      country,
      search,
    });
    return { message: 'Contestants list', ...result };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/contestants/:id
  // ──────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get contestant full details by ID' })
  async getContestantDetail(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.adminContestantsService.getContestantDetail(id);
    return { message: 'Contestant detail', data };
  }

  // ──────────────────────────────────────────────
  // POST /api/admin/contestants
  // ──────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new contestant directly from admin dashboard' })
  async createContestant(@Body() dto: CreateContestantDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminContestantsService.createContestant(dto, admin.id);
    return { message: 'Contestant created', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/contestants/:id
  // ──────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Update basic contestant details (name, country, bio, image)' })
  async updateContestant(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateContestantDto,
    @CurrentAdmin() admin: AdminTokenPayload,
  ) {
    const data = await this.adminContestantsService.updateContestant(id, dto, admin.id);
    return { message: 'Contestant updated', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/contestants/:id/stage
  // ──────────────────────────────────────────────
  @Patch(':id/stage')
  @ApiOperation({ summary: 'Move a contestant to a new stage (Stage 1 to Final) with stage history logging' })
  async moveContestantStage(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: MoveContestantStageDto,
    @CurrentAdmin() admin: AdminTokenPayload,
  ) {
    const data = await this.adminContestantsService.moveContestantStage(id, dto, admin.id);
    return { message: 'Contestant stage updated', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/contestants/:id/status
  // ──────────────────────────────────────────────
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update contestant status (pending, active, eliminated, winner)' })
  async updateContestantStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateContestantStatusDto,
    @CurrentAdmin() admin: AdminTokenPayload,
  ) {
    const data = await this.adminContestantsService.updateContestantStatus(id, dto, admin.id);
    return { message: 'Contestant status updated', data };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/contestants/:id/history
  // ──────────────────────────────────────────────
  @Get(':id/history')
  @ApiOperation({ summary: 'Get stage movement history log for a contestant' })
  async getContestantStageHistory(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.adminContestantsService.getContestantStageHistory(id);
    return { message: 'Contestant stage history', data };
  }
}
