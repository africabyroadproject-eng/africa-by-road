import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegistrationGuard } from '../../common/guards/registration.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { parsePaginationValue } from '../../common/utils/pagination';
import { VoteFavoriteDto } from './dto/vote-favorite.dto';
import { VoteService } from './vote.service';

@ApiTags('Vote')
@Controller('vote')
export class VoteController {
  constructor(private readonly voteService: VoteService) {}

  @Get('contestants')
  @ApiOperation({ summary: 'Paginated active contestants (public)' })
  async listContestants(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = parsePaginationValue(page, 1, 100000);
    const limitNum = parsePaginationValue(limit, 20, 100);
    const result = await this.voteService.listContestants(pageNum, limitNum);
    return { message: 'Contestants', ...result };
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Top 6 contestants by votes (public)' })
  async leaderboard() {
    const data = await this.voteService.leaderboard(6);
    return { message: 'Leaderboard', data };
  }

  @Post('favorite')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard, RegistrationGuard)
  @ApiOperation({ summary: 'One vote per contestant per day' })
  async voteFavorite(@CurrentUser() user: TokenPayload, @Body() dto: VoteFavoriteDto) {
    const result = await this.voteService.voteFavorite(user.id, dto.contestantId);
    return { message: result.message, data: { votes: result.votes } };
  }
}
