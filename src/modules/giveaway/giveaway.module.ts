import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { GiveawayController } from './giveaway.controller';
import { GiveawayService } from './giveaway.service';
import { GiveawaySpin, GiveawaySpinSchema } from './schemas/giveaway-spin.schema';
import { TriviaQuestion, TriviaQuestionSchema } from './schemas/trivia-question.schema';
import { TriviaResponse, TriviaResponseSchema } from './schemas/trivia-response.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: GiveawaySpin.name, schema: GiveawaySpinSchema },
      { name: TriviaQuestion.name, schema: TriviaQuestionSchema },
      { name: TriviaResponse.name, schema: TriviaResponseSchema },
    ]),
  ],
  controllers: [GiveawayController],
  providers: [GiveawayService],
})
export class GiveawayModule {}
