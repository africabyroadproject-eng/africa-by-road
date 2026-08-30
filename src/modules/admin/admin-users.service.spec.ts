import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AdminUsersService } from './admin-users.service';
import { Tourist } from '../auth/schemas/tourist.schema';
import { DocumentStorageService } from '../profile/document-storage.service';

const ADMIN_ID = new Types.ObjectId().toString();
const USER_ID = new Types.ObjectId().toString();

describe('AdminUsersService', () => {
  let adminUsersService: AdminUsersService;
  let touristModel: any;
  let documentStorageService: { getDocumentUrl: jest.Mock };

  beforeEach(async () => {
    touristModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      aggregate: jest.fn(),
    };
    documentStorageService = {
      getDocumentUrl: jest.fn().mockImplementation((key) => `https://signed.cloudinary.com/${key}`),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: getModelToken(Tourist.name), useValue: touristModel },
        { provide: DocumentStorageService, useValue: documentStorageService },
      ],
    }).compile();

    adminUsersService = moduleRef.get(AdminUsersService);
  });

  describe('listUsers', () => {
    it('returns paginated list with aggregate summary metrics', async () => {
      const mockUsers = [
        { _id: USER_ID, email: 'tourist@example.com', firstName: 'Jane', lastName: 'Doe', isPaid: true },
      ];
      const mockSummary = [
        {
          total: 1,
          active: 1,
          paid: 1,
          verified: 1,
          blocked: 0,
          pendingRegistration: 0,
          inProgressRegistration: 0,
          completeRegistration: 1,
        },
      ];

      touristModel.countDocuments.mockResolvedValue(1);
      touristModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUsers),
              }),
            }),
          }),
        }),
      });
      touristModel.aggregate.mockResolvedValue(mockSummary);

      const result = await adminUsersService.listUsers({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.data).toEqual(mockUsers);
      expect(result.userSummary.paid).toBe(1);
    });
  });

  describe('getUserDetail', () => {
    it('throws NotFoundException if user does not exist', async () => {
      touristModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        }),
      });

      await expect(adminUsersService.getUserDetail(USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns detailed user document if found', async () => {
      const mockUser = { _id: USER_ID, email: 'john@example.com', firstName: 'John' };
      touristModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      const result = await adminUsersService.getUserDetail(USER_ID);
      expect(result).toEqual(mockUser);
    });

    it('enriches governmentId, proofOfAddress, and medicalRecords with signed URLs', async () => {
      const mockUser = {
        _id: USER_ID,
        email: 'john@example.com',
        governmentId: { name: 'id.jpg', storageKey: 'key-id', resourceType: 'image', format: 'jpg' },
        proofOfAddress: { name: 'bill.pdf', storageKey: 'key-bill', resourceType: 'image', format: 'pdf' },
        medicalRecords: { name: 'doc.png', storageKey: 'key-doc', resourceType: 'image', format: 'png' },
      };
      touristModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      const result: any = await adminUsersService.getUserDetail(USER_ID);
      expect(result.governmentId.url).toBe('https://signed.cloudinary.com/key-id');
      expect(result.proofOfAddress.url).toBe('https://signed.cloudinary.com/key-bill');
      expect(result.medicalRecords.url).toBe('https://signed.cloudinary.com/key-doc');
    });
  });

  describe('toggleBlockUser', () => {
    it('throws BadRequestException if target block state matches current state', async () => {
      const mockUser = {
        _id: USER_ID,
        isBlocked: true,
        save: jest.fn(),
      };
      touristModel.findById.mockResolvedValue(mockUser);

      await expect(
        adminUsersService.toggleBlockUser(USER_ID, { isBlocked: true }, ADMIN_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks user and sets blockedAt timestamp and reason', async () => {
      const mockUser = {
        _id: USER_ID,
        email: 'bad@example.com',
        isBlocked: false,
        blockedAt: undefined,
        blockedReason: undefined,
        save: jest.fn().mockResolvedValue(true),
      };
      touristModel.findById.mockResolvedValue(mockUser);

      const result = await adminUsersService.toggleBlockUser(
        USER_ID,
        { isBlocked: true, reason: 'Terms violation' },
        ADMIN_ID,
      );

      expect(result.isBlocked).toBe(true);
      expect(result.blockedAt).toBeDefined();
      expect(result.blockedReason).toBe('Terms violation');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('unblocks user and clears blockedAt timestamp', async () => {
      const mockUser = {
        _id: USER_ID,
        email: 'good@example.com',
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: 'Old reason',
        save: jest.fn().mockResolvedValue(true),
      };
      touristModel.findById.mockResolvedValue(mockUser);

      const result = await adminUsersService.toggleBlockUser(
        USER_ID,
        { isBlocked: false, reason: 'Apology accepted' },
        ADMIN_ID,
      );

      expect(result.isBlocked).toBe(false);
      expect(result.blockedAt).toBeUndefined();
      expect(result.blockedReason).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
