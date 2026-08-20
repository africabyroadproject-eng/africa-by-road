import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AdminContestantsController } from './admin-contestants.controller';
import { AdminContestantsService } from './admin-contestants.service';
import { AdminVotingController } from './admin-voting.controller';
import { AdminVotingService } from './admin-voting.service';
import { Contestant, ContestantSchema } from './schemas/contestant.schema';
import { Vote, VoteSchema } from './schemas/vote.schema';
import { VotingCycle, VotingCycleSchema } from './schemas/voting-cycle.schema';
import { VoteController } from './vote.controller';
import { VoteService } from './vote.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: Contestant.name, schema: ContestantSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: VotingCycle.name, schema: VotingCycleSchema },
    ]),
  ],
  controllers: [VoteController, AdminVotingController, AdminContestantsController],
  providers: [VoteService, AdminVotingService, AdminContestantsService],
  exports: [VoteService, AdminVotingService, AdminContestantsService],
})
export class VoteModule {}


