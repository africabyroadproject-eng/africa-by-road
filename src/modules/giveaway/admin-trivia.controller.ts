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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminTokenPayload } from '../../common/interfaces/token-payload.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { parsePaginationValue } from '../../common/utils/pagination';
import { AdminTriviaService } from './admin-trivia.service';
import { CreateTriviaDto } from './dto/create-trivia.dto';
import { UpdateTriviaDto } from './dto/update-trivia.dto';

/**
 * Extracts the admin token payload from the request (set by AdminAuthGuard).
 */
const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext): AdminTokenPayload => {
  const req = ctx.switchToHttp().getRequest();
  return (req as any).admin!;
});

@ApiTags('Admin — Trivia Management')
@Controller('admin/trivia')
@ApiBearerAuth('bearerAuth')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('trivia_manager')
export class AdminTriviaController {
  constructor(private readonly adminTriviaService: AdminTriviaService) {}

  // ──────────────────────────────────────────────
  // GET /api/admin/trivia
  // ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all trivia questions with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listQuestions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 20, 100);
    const result = await this.adminTriviaService.listQuestions({
      page: pageNum,
      limit: limitNum,
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
    return { message: 'Trivia questions', ...result };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/trivia/stats
  // ──────────────────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'Get trivia summary statistics' })
  async getStats() {
    const data = await this.adminTriviaService.getStats();
    return { message: 'Trivia stats', data };
  }

  // ──────────────────────────────────────────────
  // GET /api/admin/trivia/:id
  // ──────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Get trivia question detail with response count and change history' })
  async getQuestionDetail(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.adminTriviaService.getQuestionDetail(id);
    return { message: 'Trivia question detail', data };
  }

  // ──────────────────────────────────────────────
  // POST /api/admin/trivia
  // ──────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trivia question' })
  async createQuestion(@Body() dto: CreateTriviaDto, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminTriviaService.createQuestion(dto, admin.id);
    return { message: 'Trivia question created', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/trivia/:id
  // ──────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Update a trivia question (logs changes to correct answer if submissions exist)' })
  async updateQuestion(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateTriviaDto,
    @CurrentAdmin() admin: AdminTokenPayload,
  ) {
    const data = await this.adminTriviaService.updateQuestion(id, dto, admin.id);
    return { message: 'Trivia question updated', data };
  }

  // ──────────────────────────────────────────────
  // DELETE /api/admin/trivia/:id
  // ──────────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a trivia question (preserves response history)' })
  async deleteQuestion(@Param('id', ParseObjectIdPipe) id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminTriviaService.deleteQuestion(id, admin.id);
    return { message: 'Trivia question deleted', data };
  }

  // ──────────────────────────────────────────────
  // PATCH /api/admin/trivia/:id/toggle
  // ──────────────────────────────────────────────
  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Toggle trivia question active/inactive status' })
  async toggleActive(@Param('id', ParseObjectIdPipe) id: string, @CurrentAdmin() admin: AdminTokenPayload) {
    const data = await this.adminTriviaService.toggleActive(id, admin.id);
    return { message: 'Trivia question toggled', data };
  }
}
