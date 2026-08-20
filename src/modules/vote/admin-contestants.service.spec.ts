import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AdminContestantsService } from './admin-contestants.service';
import { Contestant } from './schemas/contestant.schema';

const ADMIN_ID = new Types.ObjectId().toString();
const CONTESTANT_ID = new Types.ObjectId().toString();

describe('AdminContestantsService', () => {
  let adminContestantsService: AdminContestantsService;
  let contestantModel: any;

  beforeEach(async () => {
    contestantModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      aggregate: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminContestantsService,
        { provide: getModelToken(Contestant.name), useValue: contestantModel },
      ],
    }).compile();

    adminContestantsService = moduleRef.get(AdminContestantsService);
  });

  describe('listContestants', () => {
    it('returns paginated list with stage summary stats', async () => {
      const mockContestants = [
        { _id: CONTESTANT_ID, name: 'Kofi Mensah', country: 'Ghana', currentStage: 'Stage 1', status: 'active' },
      ];
      const mockSummary = [
        {
          total: 1,
          active: 1,
          pending: 0,
          eliminated: 0,
          winner: 0,
          stage1: 1,
          stage2: 0,
          stage3: 0,
          stage4: 0,
          final: 0,
        },
      ];

      contestantModel.countDocuments.mockResolvedValue(1);
      contestantModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockContestants),
            }),
          }),
        }),
      });
      contestantModel.aggregate.mockResolvedValue(mockSummary);

      const result = await adminContestantsService.listContestants({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.data).toEqual(mockContestants);
      expect(result.stageSummary.stage1).toBe(1);
    });
  });

  describe('getContestantDetail', () => {
    it('throws NotFoundException if contestant does not exist', async () => {
      contestantModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });

      await expect(adminContestantsService.getContestantDetail(CONTESTANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns contestant document if found', async () => {
      const mockDoc = { _id: CONTESTANT_ID, name: 'Zainab Ali' };
      contestantModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue(mockDoc) });

      const result = await adminContestantsService.getContestantDetail(CONTESTANT_ID);
      expect(result).toEqual(mockDoc);
    });
  });

  describe('createContestant', () => {
    it('creates new contestant with initial stage history', async () => {
      const dto = {
        name: 'Amara Diallo',
        country: 'Senegal',
        bio: 'Adventurer',
        imageUrl: 'https://example.com/image.jpg',
      };
      const createdDoc = { _id: CONTESTANT_ID, ...dto, currentStage: 'Stage 1', status: 'active' };
      contestantModel.create.mockResolvedValue(createdDoc);

      const result = await adminContestantsService.createContestant(dto, ADMIN_ID);
      expect(result).toEqual(createdDoc);
      expect(contestantModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          currentStage: 'Stage 1',
          status: 'active',
          stageHistory: expect.arrayContaining([
            expect.objectContaining({ fromStage: 'N/A', toStage: 'Stage 1' }),
          ]),
        }),
      );
    });
  });

  describe('moveContestantStage', () => {
    it('throws BadRequestException if target stage is same as current stage', async () => {
      const mockContestant = {
        _id: CONTESTANT_ID,
        name: 'Amara Diallo',
        currentStage: 'Stage 2',
        stageHistory: [],
        save: jest.fn(),
      };
      contestantModel.findById.mockResolvedValue(mockContestant);

      await expect(
        adminContestantsService.moveContestantStage(CONTESTANT_ID, { stage: 'Stage 2' }, ADMIN_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates currentStage and pushes history entry', async () => {
      const mockContestant = {
        _id: CONTESTANT_ID,
        name: 'Amara Diallo',
        currentStage: 'Stage 1',
        stageHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };
      contestantModel.findById.mockResolvedValue(mockContestant);

      const result = await adminContestantsService.moveContestantStage(
        CONTESTANT_ID,
        { stage: 'Stage 2', reason: 'Passed evaluation' },
        ADMIN_ID,
      );

      expect(result.currentStage).toBe('Stage 2');
      expect(result.stageHistory.length).toBe(1);
      expect(result.stageHistory[0].fromStage).toBe('Stage 1');
      expect(result.stageHistory[0].toStage).toBe('Stage 2');
      expect(mockContestant.save).toHaveBeenCalled();
    });
  });

  describe('updateContestantStatus', () => {
    it('throws BadRequestException if status is unchanged', async () => {
      const mockContestant = {
        _id: CONTESTANT_ID,
        status: 'active',
        save: jest.fn(),
      };
      contestantModel.findById.mockResolvedValue(mockContestant);

      await expect(
        adminContestantsService.updateContestantStatus(CONTESTANT_ID, { status: 'active' }, ADMIN_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates status and sets eliminatedAt when eliminated', async () => {
      const mockContestant = {
        _id: CONTESTANT_ID,
        name: 'Amara Diallo',
        status: 'active',
        eliminatedAt: undefined,
        save: jest.fn().mockResolvedValue(true),
      };
      contestantModel.findById.mockResolvedValue(mockContestant);

      const result = await adminContestantsService.updateContestantStatus(
        CONTESTANT_ID,
        { status: 'eliminated', reason: 'Lowest votes' },
        ADMIN_ID,
      );

      expect(result.status).toBe('eliminated');
      expect(result.eliminatedAt).toBeDefined();
      expect(mockContestant.save).toHaveBeenCalled();
    });
  });
});
