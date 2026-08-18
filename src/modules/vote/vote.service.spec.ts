import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { VoteService } from './vote.service';
import { Contestant } from './schemas/contestant.schema';
import { Vote } from './schemas/vote.schema';
import { VotingCycle } from './schemas/voting-cycle.schema';

const TOURIST_ID = new Types.ObjectId().toString();
const CONTESTANT_ID = new Types.ObjectId().toString();
const CYCLE_ID = new Types.ObjectId();

const ACTIVE_CYCLE = { _id: CYCLE_ID, name: 'Test Cycle', status: 'active', startedAt: new Date() };

describe('VoteService', () => {
  let voteService: VoteService;
  let contestantModel: any;
  let voteModel: any;
  let votingCycleModel: any;

  beforeEach(async () => {
    contestantModel = { findOne: jest.fn(), findByIdAndUpdate: jest.fn(), find: jest.fn(), countDocuments: jest.fn() };
    voteModel = { create: jest.fn() };
    votingCycleModel = { findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VoteService,
        { provide: getModelToken(Contestant.name), useValue: contestantModel },
        { provide: getModelToken(Vote.name), useValue: voteModel },
        { provide: getModelToken(VotingCycle.name), useValue: votingCycleModel },
      ],
    }).compile();

    voteService = moduleRef.get(VoteService);
  });

  it('rejects voting when no active cycle exists', async () => {
    votingCycleModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

    await expect(voteService.voteFavorite(TOURIST_ID, CONTESTANT_ID)).rejects.toThrow(
      new BadRequestException('No active voting cycle. Voting is currently closed.'),
    );
  });

  it('rejects voting for a contestant that is not active', async () => {
    votingCycleModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(ACTIVE_CYCLE) });
    contestantModel.findOne.mockResolvedValue(null);

    await expect(voteService.voteFavorite(TOURIST_ID, CONTESTANT_ID)).rejects.toThrow(
      new BadRequestException('Contestant not found or inactive'),
    );
  });

  it('rejects a second vote for the same contestant on the same day', async () => {
    votingCycleModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(ACTIVE_CYCLE) });
    contestantModel.findOne.mockResolvedValue({ votes: 5, status: 'active' });
    const duplicateKeyError = Object.assign(new Error('duplicate'), { code: 11000 });
    voteModel.create.mockRejectedValue(duplicateKeyError);

    await expect(voteService.voteFavorite(TOURIST_ID, CONTESTANT_ID)).rejects.toThrow(
      new BadRequestException('You have already voted for this contestant today'),
    );
  });

  it('records the vote and increments the contestant tally', async () => {
    votingCycleModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(ACTIVE_CYCLE) });
    contestantModel.findOne.mockResolvedValue({ votes: 5, status: 'active' });
    voteModel.create.mockResolvedValue({});
    contestantModel.findByIdAndUpdate.mockResolvedValue({ votes: 6 });

    const result = await voteService.voteFavorite(TOURIST_ID, CONTESTANT_ID);

    expect(result).toEqual({ message: 'Vote recorded', votes: 6 });
  });
});

