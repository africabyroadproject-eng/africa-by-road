import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegistrationGuard } from '../../common/guards/registration.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { SubmitTriviaDto } from './dto/submit-trivia.dto';
import { GiveawayService } from './giveaway.service';

@ApiTags('Giveaway')
@Controller('giveaway')
export class GiveawayController {
  constructor(private readonly giveawayService: GiveawayService) {}

  @Get('spin/status')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard, RegistrationGuard)
  @ApiOperation({ summary: 'Check remaining spins/trivia for today' })
  async spinStatus(@CurrentUser() user: TokenPayload) {
    const data = await this.giveawayService.spinStatus(user.id);
    return { message: 'Spin status', data };
  }

  @Post('spin')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard, RegistrationGuard)
  @ApiOperation({ summary: 'Perform one daily spin, win prize' })
  async spin(@CurrentUser() user: TokenPayload) {
    const data = await this.giveawayService.spin(user.id);
    return { message: 'Spin success', data };
  }

  @Get('trivia/question')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard, RegistrationGuard)
  @ApiOperation({ summary: 'Get active/default trivia question' })
  async getTriviaQuestion() {
    const data = await this.giveawayService.getTriviaQuestion();
    return { message: 'Trivia question', data };
  }

  @Post('trivia/submit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard, RegistrationGuard)
  @ApiOperation({ summary: 'Submit trivia answer, win if correct' })
  async submitTrivia(@CurrentUser() user: TokenPayload, @Body() dto: SubmitTriviaDto) {
    const data = await this.giveawayService.submitTriviaAnswer(user.id, dto.questionId, dto.selectedAnswer);
    return { message: 'Trivia submitted', data };
  }

  @Get('winners')
  @ApiOperation({ summary: "List today's prize winners (public)" })
  async getTodaysWinners() {
    const data = await this.giveawayService.getTodaysWinners();
    return { message: "Today's winners", data };
  }

  @Get('spins/:id')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard, RegistrationGuard)
  @ApiOperation({ summary: 'Get spin record by ID' })
  async getSpinDetail(@Param('id', ParseObjectIdPipe) id: string) {
    const data = await this.giveawayService.getSpinDetail(id);
    return { message: 'Spin detail', data };
  }
}
