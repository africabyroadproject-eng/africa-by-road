import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { GiveawayService } from './giveaway.service';
import { GiveawaySpin } from './schemas/giveaway-spin.schema';
import { Prize } from './schemas/prize.schema';
import { PrizeSnapshot } from './schemas/prize-snapshot.schema';
import { TriviaQuestion } from './schemas/trivia-question.schema';
import { TriviaResponse } from './schemas/trivia-response.schema';

const TOURIST_ID = '507f1f77bcf86cd799439011';

describe('GiveawayService', () => {
  let giveawayService: GiveawayService;
  let giveawaySpinModel: any;
  let triviaQuestionModel: any;
  let triviaResponseModel: any;
  let prizeModel: any;
  let prizeSnapshotModel: any;

  beforeEach(async () => {
    giveawaySpinModel = { create: jest.fn(), findOne: jest.fn(), find: jest.fn(), findById: jest.fn() };
    triviaQuestionModel = { findOne: jest.fn(), findById: jest.fn() };
    triviaResponseModel = { create: jest.fn(), findOne: jest.fn() };
    prizeModel = {
      find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
    };
    prizeSnapshotModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GiveawayService,
        { provide: getModelToken(GiveawaySpin.name), useValue: giveawaySpinModel },
        { provide: getModelToken(TriviaQuestion.name), useValue: triviaQuestionModel },
        { provide: getModelToken(TriviaResponse.name), useValue: triviaResponseModel },
        { provide: getModelToken(Prize.name), useValue: prizeModel },
        { provide: getModelToken(PrizeSnapshot.name), useValue: prizeSnapshotModel },
      ],
    }).compile();

    giveawayService = moduleRef.get(GiveawayService);
  });

  describe('spin', () => {
    it('rejects a second spin the same day with a friendly message', async () => {
      const duplicateKeyError = Object.assign(new Error('duplicate'), { code: 11000 });
      giveawaySpinModel.create.mockRejectedValue(duplicateKeyError);

      await expect(giveawayService.spin(TOURIST_ID)).rejects.toThrow(
        new BadRequestException('You have already used your free spin today'),
      );
    });

    it('returns No Win when no prizes are available', async () => {
      // prizeModel.find already returns empty array
      giveawaySpinModel.create.mockResolvedValue({ prize: 'No Win' });

      const result = await giveawayService.spin(TOURIST_ID);

      expect(result).toEqual({ prize: 'No Win', message: 'Spin completed' });
    });

    it('rethrows unrelated database errors', async () => {
      giveawaySpinModel.create.mockRejectedValue(new Error('connection lost'));

      await expect(giveawayService.spin(TOURIST_ID)).rejects.toThrow('connection lost');
    });
  });

  describe('getSpinDetail', () => {
    it('throws NotFoundException when the spin does not exist', async () => {
      giveawaySpinModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      });

      await expect(giveawayService.getSpinDetail('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
