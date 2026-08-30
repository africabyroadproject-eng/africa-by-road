import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AdminSpinController } from './admin-spin.controller';
import { AdminSpinService } from './admin-spin.service';
import { AdminTriviaController } from './admin-trivia.controller';
import { AdminTriviaService } from './admin-trivia.service';
import { GiveawayController } from './giveaway.controller';
import { GiveawayService } from './giveaway.service';
import { GiveawaySpin, GiveawaySpinSchema } from './schemas/giveaway-spin.schema';
import { Prize, PrizeSchema } from './schemas/prize.schema';
import { PrizeSnapshot, PrizeSnapshotSchema } from './schemas/prize-snapshot.schema';
import { TriviaAnswerChangeLog, TriviaAnswerChangeLogSchema } from './schemas/trivia-answer-change-log.schema';
import { TriviaQuestion, TriviaQuestionSchema } from './schemas/trivia-question.schema';
import { TriviaResponse, TriviaResponseSchema } from './schemas/trivia-response.schema';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: GiveawaySpin.name, schema: GiveawaySpinSchema },
      { name: Prize.name, schema: PrizeSchema },
      { name: PrizeSnapshot.name, schema: PrizeSnapshotSchema },
      { name: TriviaAnswerChangeLog.name, schema: TriviaAnswerChangeLogSchema },
      { name: TriviaQuestion.name, schema: TriviaQuestionSchema },
      { name: TriviaResponse.name, schema: TriviaResponseSchema },
    ]),
  ],
  controllers: [GiveawayController, AdminTriviaController, AdminSpinController],
  providers: [GiveawayService, AdminTriviaService, AdminSpinService],
  exports: [GiveawayService],
})
export class GiveawayModule {}
