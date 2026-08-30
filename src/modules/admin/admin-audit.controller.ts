import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { parsePaginationValue } from '../../common/utils/pagination';
import { AuditService } from '../../common/services/audit.service';

@ApiTags('Admin — Audit Logs')
@Controller('admin/audit-logs')
@ApiBearerAuth('bearerAuth')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('superadmin')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  // ──────────────────────────────────────────────
  // GET /api/admin/audit-logs
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List audit logs with filters and pagination (superadmin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'module', required: false, type: String, description: 'Filter by module name' })
  @ApiQuery({ name: 'adminId', required: false, type: String, description: 'Filter by admin user ID' })
  @ApiQuery({ name: 'action', required: false, type: String, description: 'Filter by action (supports partial match)' })
  @ApiQuery({ name: 'targetType', required: false, type: String, description: 'Filter by target type' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  async listLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('module') module?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 50, 200);
    const result = await this.auditService.queryLogs({
      page: pageNum,
      limit: limitNum,
      module,
      adminId,
      action,
      targetType,
      startDate,
      endDate,
    });
    return { message: 'Audit logs', ...result };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/audit-logs/:id
  // ──────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit log entry by ID' })
  async getLogDetail(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.auditService.getLogById(id);
    if (!data) {
      throw new NotFoundException('Audit log entry not found');
    }
    return { message: 'Audit log detail', data };
  }
}
