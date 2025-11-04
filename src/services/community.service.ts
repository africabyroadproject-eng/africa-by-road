import { Message } from '../models/message.model';
import { Types } from 'mongoose';

class CommunityService {
    public async listMessages(limit = 20) {
        return Message.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('author', 'firstName lastName')
            .lean();
    }

    public async postMessage(authorId: string, content: string, attachments?: Array<{ type: 'image' | 'video'; url: string; caption?: string }>) {
        const doc = await Message.create({
            author: new Types.ObjectId(authorId),
            content: content.trim(),
            attachments
        });
        return doc;
    }

    public async likeMessage(messageId: string) {
        const updated = await Message.findByIdAndUpdate(
            messageId,
            { $inc: { reactionLikes: 1 } },
            { new: true }
        );
        return updated;
    }
}

export const communityService = new CommunityService();