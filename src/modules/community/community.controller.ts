import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegistrationGuard } from '../../common/guards/registration.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { parsePaginationValue } from '../../common/utils/pagination';
import { CommunityService } from './community.service';
import { PostMessageDto } from './dto/post-message.dto';
import { PostReplyDto } from './dto/post-reply.dto';

@ApiTags('Community')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, RegistrationGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('messages')
  @ApiOperation({ summary: 'Paginated message list' })
  async listMessages(@CurrentUser() user: TokenPayload, @Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 20, 100);
    const result = await this.communityService.listMessages(user?.id, pageNum, limitNum);
    return { message: 'Messages', ...result };
  }

  @Get('messages/search')
  @ApiOperation({ summary: 'Search messages by query' })
  async searchMessages(@CurrentUser() user: TokenPayload, @Query('q') q?: string) {
    if (!q?.trim()) {
      throw new BadRequestException('Search query required');
    }
    if (q.length > 100) {
      throw new BadRequestException('Search query is too long');
    }
    const data = await this.communityService.searchMessages(q.trim(), user?.id, 20);
    return { message: 'Search results', data };
  }

  @Post('messages')
  @ApiOperation({ summary: 'Create new message with attachments' })
  async postMessage(@CurrentUser() user: TokenPayload, @Body() dto: PostMessageDto) {
    const data = await this.communityService.postMessage(user.id, dto.content, dto.attachments);
    return { message: 'Message posted', data };
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get single message with like/reply counts' })
  async getMessage(@CurrentUser() user: TokenPayload, @Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.communityService.getMessage(id, user?.id);
    return { message: 'Message detail', data };
  }

  @Post('messages/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on message' })
  async likeMessage(@CurrentUser() user: TokenPayload, @Param('id', ParseObjectIdPipe) id: string) {
    const result = await this.communityService.likeMessage(id, user.id);
    return { message: result.liked ? 'Liked' : 'Unliked', data: result };
  }

  @Get('messages/:id/replies')
  @ApiOperation({ summary: 'Paginated replies to a message' })
  async listReplies(@CurrentUser() user: TokenPayload, @Param('id', ParseObjectIdPipe) id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 10, 50);
    const result = await this.communityService.listReplies(id, user?.id, pageNum, limitNum);
    return { message: 'Replies', ...result };
  }

  @Post('messages/:id/replies')
  @ApiOperation({ summary: 'Create reply to message' })
  async postReply(@CurrentUser() user: TokenPayload, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: PostReplyDto) {
    const data = await this.communityService.postReply(id, user.id, dto.content);
    return { message: 'Reply posted', data };
  }

  @Post('replies/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on reply' })
  async likeReply(@CurrentUser() user: TokenPayload, @Param('id', ParseObjectIdPipe) id: string) {
    const result = await this.communityService.likeReply(id, user.id);
    return { message: result.liked ? 'Liked' : 'Unliked', data: result };
  }
}
