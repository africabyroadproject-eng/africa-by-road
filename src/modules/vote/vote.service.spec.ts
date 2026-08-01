import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { VoteService } from './vote.service';
import { Contestant } from './schemas/contestant.schema';
import { Vote } from './schemas/vote.schema';

const TOURIST_ID = new Types.ObjectId().toString();
const CONTESTANT_ID = new Types.ObjectId().toString();

describe('VoteService', () => {
  let voteService: VoteService;
  let contestantModel: any;
  let voteModel: any;

  beforeEach(async () => {
    contestantModel = { findOne: jest.fn(), findByIdAndUpdate: jest.fn(), find: jest.fn(), countDocuments: jest.fn() };
    voteModel = { create: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        VoteService,
        { provide: getModelToken(Contestant.name), useValue: contestantModel },
        { provide: getModelToken(Vote.name), useValue: voteModel },
      ],
    }).compile();

    voteService = moduleRef.get(VoteService);
  });

  it('rejects voting for a contestant that is not active', async () => {
    contestantModel.findOne.mockResolvedValue(null);

    await expect(voteService.voteFavorite('tourist-id', 'contestant-id')).rejects.toThrow(
      new BadRequestException('Contestant not found or inactive'),
    );
  });

  it('rejects a second vote for the same contestant on the same day', async () => {
    contestantModel.findOne.mockResolvedValue({ votes: 5 });
    const duplicateKeyError = Object.assign(new Error('duplicate'), { code: 11000 });
    voteModel.create.mockRejectedValue(duplicateKeyError);

    await expect(voteService.voteFavorite(TOURIST_ID, CONTESTANT_ID)).rejects.toThrow(
      new BadRequestException('You have already voted for this contestant today'),
    );
  });

  it('records the vote and increments the contestant tally', async () => {
    contestantModel.findOne.mockResolvedValue({ votes: 5 });
    voteModel.create.mockResolvedValue({});
    contestantModel.findByIdAndUpdate.mockResolvedValue({ votes: 6 });

    const result = await voteService.voteFavorite(TOURIST_ID, CONTESTANT_ID);

    expect(result).toEqual({ message: 'Vote recorded', votes: 6 });
  });
});
