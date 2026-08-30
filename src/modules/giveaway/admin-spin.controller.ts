import {
  Body,
  Controller,
  createParamDecorator,
  Delete,
  ExecutionContext,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminTokenPayload } from '../../common/interfaces/token-payload.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { AdminSpinService } from './admin-spin.service';
import { CreatePrizeDto } from './dto/create-prize.dto';
import { UpdatePrizeDto } from './dto/update-prize.dto';

/**
 * Extracts the admin token payload from the request (set by AdminAuthGuard).
 */
const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminTokenPayload => {
  const req = ctx.switchToHttp().getRequest();
  return (req as any).admin!;
});

@ApiTags('Admin — Spin-the-Wheel Prize Management')
@Controller('admin/spin-wheel/prizes')
@ApiBearerAuth('bearerAuth')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('prize_manager')
export class AdminSpinController {
  constructor(private readonly adminSpinService: AdminSpinService) {}

  // ──────────────────────────────────────────────
  // GET /api/admin/spin-wheel/prizes
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all prize slots with stock levels (max 10)' })
  async listPrizes() {
    const data = await this.adminSpinService.listPrizes();
    return { message: 'Prize slots', ...data };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/spin-wheel/prizes/stats
  // ──────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get spin-the-wheel prize summary statistics' })
  async getStats() {
    const data = await this.adminSpinService.getStats();
    return { message: 'Spin prize stats', data };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/spin-wheel/prizes/:id
  // ──────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get single prize slot details with award history count' })
  async getPrizeDetail(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.adminSpinService.getPrizeDetail(id);
    return { message: 'Prize detail', data };
  }

  // ──────────────────────────────────────────────
  // POST /api/admin/spin-wheel/prizes
  // ──────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new prize slot (max 10 total)' })
  async createPrize(@Body() dto: CreatePrizeDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminSpinService.createPrize(dto, admin.id);
    return { message: 'Prize created', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/spin-wheel/prizes/:id
  // ──────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Update prize slot (name, stock, weight, description, position)' })
  async updatePrize(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePrizeDto,
    @CurrentAdmin() admin: AdminTokenPayload,
  ) {
    const data = await this.adminSpinService.updatePrize(id, dto, admin.id);
    return { message: 'Prize updated', data };
  }

  // ──────────────────────────────────────────────
  // DELETE /api/admin/spin-wheel/prizes/:id
  // ──────────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a prize slot (soft-delete preserves award history)' })
  async deletePrize(@Param('id', ParseObjectIdPipe) id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminSpinService.deletePrize(id, admin.id);
    return { message: 'Prize deleted', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/spin-wheel/prizes/:id/toggle
  // ──────────────────────────────────────────────
  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle prize slot active/inactive status' })
  async toggleActive(@Param('id', ParseObjectIdPipe) id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminSpinService.toggleActive(id, admin.id);
    return { message: 'Prize toggled', data };
  }
}
