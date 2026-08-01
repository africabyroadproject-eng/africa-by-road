import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CommunityService } from './community.service';
import { Message } from './schemas/message.schema';
import { Reply } from './schemas/reply.schema';

describe('CommunityService', () => {
  let communityService: CommunityService;
  let messageModel: any;
  let replyModel: any;

  beforeEach(async () => {
    messageModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    replyModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommunityService,
        { provide: getModelToken(Message.name), useValue: messageModel },
        { provide: getModelToken(Reply.name), useValue: replyModel },
      ],
    }).compile();

    communityService = moduleRef.get(CommunityService);
  });

  describe('likeMessage', () => {
    it('throws when the message does not exist', async () => {
      messageModel.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });

      await expect(communityService.likeMessage('missing-id', new Types.ObjectId().toString())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('likes a message the tourist has not liked yet', async () => {
      const touristId = new Types.ObjectId().toString();
      messageModel.findById
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ likes: [] }) }) })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ likes: [new Types.ObjectId(touristId)] }) }),
        });

      const result = await communityService.likeMessage('message-id', touristId);

      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(1);
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith('message-id', { $addToSet: { likes: expect.any(Types.ObjectId) } });
    });

    it('unlikes a message the tourist already liked', async () => {
      const touristId = new Types.ObjectId().toString();
      const touristOid = new Types.ObjectId(touristId);
      messageModel.findById
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ likes: [touristOid] }) }) })
        .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ likes: [] }) }) });

      const result = await communityService.likeMessage('message-id', touristId);

      expect(result.liked).toBe(false);
      expect(result.likeCount).toBe(0);
      expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith('message-id', { $pull: { likes: expect.any(Types.ObjectId) } });
    });
  });
});
