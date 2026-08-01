import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Contestant, ContestantSchema } from './schemas/contestant.schema';
import { Vote, VoteSchema } from './schemas/vote.schema';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Contestant.name, schema: ContestantSchema },
      { name: Vote.name, schema: VoteSchema },
    ]),
  ],
  controllers: [VoteController],
  providers: [VoteService],
})
export class VoteModule {}
