import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { GiveawayService } from './giveaway.service';
import { GiveawaySpin } from './schemas/giveaway-spin.schema';
import { TriviaQuestion } from './schemas/trivia-question.schema';
import { TriviaResponse } from './schemas/trivia-response.schema';

const TOURIST_ID = '507f1f77bcf86cd799439011';

describe('GiveawayService', () => {
  let giveawayService: GiveawayService;
  let giveawaySpinModel: any;
  let triviaQuestionModel: any;
  let triviaResponseModel: any;

  beforeEach(async () => {
    giveawaySpinModel = { create: jest.fn(), findOne: jest.fn(), find: jest.fn(), findById: jest.fn() };
    triviaQuestionModel = { findOne: jest.fn(), findById: jest.fn() };
    triviaResponseModel = { create: jest.fn(), findOne: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GiveawayService,
        { provide: getModelToken(GiveawaySpin.name), useValue: giveawaySpinModel },
        { provide: getModelToken(TriviaQuestion.name), useValue: triviaQuestionModel },
        { provide: getModelToken(TriviaResponse.name), useValue: triviaResponseModel },
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

    it('records a spin and returns the prize on success', async () => {
      giveawaySpinModel.create.mockResolvedValue({ prize: 'Water Bottle' });

      const result = await giveawayService.spin(TOURIST_ID);

      expect(result).toEqual({ prize: 'Water Bottle', message: 'Spin completed' });
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
