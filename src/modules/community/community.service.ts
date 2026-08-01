import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IAttachment, Message, MessageDocument } from './schemas/message.schema';
import { Reply, ReplyDocument } from './schemas/reply.schema';

@Injectable()
export class CommunityService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Reply.name) private readonly replyModel: Model<ReplyDocument>,
  ) {}

  async getMessage(messageId: string, touristId?: string) {
    const message = await this.messageModel
      .findById(messageId)
      .populate('author', 'firstName lastName')
      .populate('likes', 'firstName lastName')
      .lean();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const likesArray = (message.likes as unknown[]) || [];
    const touristOid = touristId ? new Types.ObjectId(touristId) : null;
    const replyCount = await this.replyModel.countDocuments({ messageId: message._id });

    return {
      ...message,
      likeCount: likesArray.length,
      replyCount,
      likedByCurrentUser: touristOid ? likesArray.some((id) => touristOid.equals(id as Types.ObjectId)) : false,
    };
  }

  async listMessages(touristId: string | undefined, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, messages] = await Promise.all([
      this.messageModel.countDocuments({}),
      this.messageModel.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'firstName lastName').lean(),
    ]);

    const touristOid = touristId ? new Types.ObjectId(touristId) : null;
    const messageIds = messages.map((m) => m._id);

    const replyCounts = await this.replyModel.aggregate([
      { $match: { messageId: { $in: messageIds } } },
      { $group: { _id: '$messageId', count: { $sum: 1 } } },
    ]);
    const replyCountMap = new Map(replyCounts.map((r) => [String(r._id), r.count]));

    const data = messages.map((msg) => {
      const likesArray = (msg.likes as unknown[]) || [];
      return {
        ...msg,
        likeCount: likesArray.length,
        replyCount: replyCountMap.get(String(msg._id)) || 0,
        likedByCurrentUser: touristOid ? likesArray.some((id) => touristOid.equals(id as Types.ObjectId)) : false,
      };
    });

    return { total, page, limit, totalPages: Math.ceil(total / limit) || 1, data };
  }

  async searchMessages(query: string, touristId?: string, limit = 20) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const messages = await this.messageModel
      .find({ content: { $regex: escapedQuery, $options: 'i' } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'firstName lastName')
      .lean();

    const touristOid = touristId ? new Types.ObjectId(touristId) : null;
    const messageIds = messages.map((m) => m._id);

    const replyCounts = await this.replyModel.aggregate([
      { $match: { messageId: { $in: messageIds } } },
      { $group: { _id: '$messageId', count: { $sum: 1 } } },
    ]);
    const replyCountMap = new Map(replyCounts.map((r) => [String(r._id), r.count]));

    return messages.map((msg) => {
      const likesArray = (msg.likes as unknown[]) || [];
      return {
        ...msg,
        likeCount: likesArray.length,
        replyCount: replyCountMap.get(String(msg._id)) || 0,
        likedByCurrentUser: touristOid ? likesArray.some((id) => touristOid.equals(id as Types.ObjectId)) : false,
      };
    });
  }

  async postMessage(authorId: string, content: string, attachments?: IAttachment[]) {
    return this.messageModel.create({
      author: new Types.ObjectId(authorId),
      content: content.trim(),
      attachments,
      likes: [],
    });
  }

  async likeMessage(messageId: string, touristId: string) {
    const touristOid = new Types.ObjectId(touristId);

    const message = await this.messageModel.findById(messageId).select('likes').lean();
    if (!message) {
      throw new BadRequestException('Message not found');
    }

    const alreadyLiked = (message.likes as Types.ObjectId[]).some((id) => id.equals(touristOid));

    if (alreadyLiked) {
      await this.messageModel.findByIdAndUpdate(messageId, { $pull: { likes: touristOid } });
    } else {
      await this.messageModel.findByIdAndUpdate(messageId, { $addToSet: { likes: touristOid } });
    }

    const updated = await this.messageModel.findById(messageId).select('likes').lean();
    return { liked: !alreadyLiked, likeCount: (updated?.likes as unknown[])?.length || 0 };
  }

  async listReplies(messageId: string, touristId?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [total, replies] = await Promise.all([
      this.replyModel.countDocuments({ messageId }),
      this.replyModel
        .find({ messageId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'firstName lastName')
        .populate('likes', 'firstName lastName')
        .lean(),
    ]);

    const touristOid = touristId ? new Types.ObjectId(touristId) : null;

    const data = replies.map((reply) => {
      const likesArray = (reply.likes as unknown[]) || [];
      return {
        ...reply,
        likeCount: likesArray.length,
        likedByCurrentUser: touristOid ? likesArray.some((id) => touristOid.equals(id as Types.ObjectId)) : false,
      };
    });

    return { total, page, limit, totalPages: Math.ceil(total / limit) || 1, data };
  }

  async postReply(messageId: string, authorId: string, content: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new BadRequestException('Message not found');
    }

    return this.replyModel.create({
      messageId: new Types.ObjectId(messageId),
      author: new Types.ObjectId(authorId),
      content: content.trim(),
      likes: [],
    });
  }

  async likeReply(replyId: string, touristId: string) {
    const touristOid = new Types.ObjectId(touristId);

    const reply = await this.replyModel.findById(replyId).select('likes').lean();
    if (!reply) {
      throw new BadRequestException('Reply not found');
    }

    const alreadyLiked = (reply.likes as Types.ObjectId[]).some((id) => id.equals(touristOid));

    if (alreadyLiked) {
      await this.replyModel.findByIdAndUpdate(replyId, { $pull: { likes: touristOid } });
    } else {
      await this.replyModel.findByIdAndUpdate(replyId, { $addToSet: { likes: touristOid } });
    }

    const updated = await this.replyModel.findById(replyId).select('likes').lean();
    return { liked: !alreadyLiked, likeCount: (updated?.likes as unknown[])?.length || 0 };
  }
}
