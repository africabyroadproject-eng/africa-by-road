import { Message } from '../models/message.model';
import { Reply } from '../models/reply.model';
import { Types } from 'mongoose';

class CommunityService {
    public async getMessage(messageId: string, touristId?: string): Promise<any> {
        const message = await Message.findById(messageId)
            .populate('author', 'firstName lastName')
            .populate('likes', 'firstName lastName')
            .lean();

        if (!message) {
            throw new Error('Message not found');
        }

        const likesArray = message.likes as any[] || [];
        const touristOid = touristId ? new Types.ObjectId(touristId) : null;
        const replyCount = await Reply.countDocuments({ messageId: message._id });

        return {
            ...message,
            likeCount: likesArray.length,
            replyCount,
            likedByCurrentUser: touristOid
                ? likesArray.some((id) => touristOid.equals(id))
                : false,
        };
    }

    public async listMessages(touristId?: string, page = 1, limit = 20): Promise<{ total: number; page: number; limit: number; totalPages: number; data: any[] }> {
        const skip = (page - 1) * limit;
        const [total, messages] = await Promise.all([
            Message.countDocuments({}),
            Message.find({})
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'firstName lastName')
                .lean()
        ]);

        const touristOid = touristId ? new Types.ObjectId(touristId) : null;
        const messageIds = messages.map((m) => m._id);

        const replyCounts = await Reply.aggregate([
            { $match: { messageId: { $in: messageIds } } },
            { $group: { _id: '$messageId', count: { $sum: 1 } } }
        ]);
        const replyCountMap = new Map(replyCounts.map((r) => [String(r._id), r.count]));

        const data = messages.map((msg) => {
            const likesArray = msg.likes as any[] || [];
            return {
                ...msg,
                likeCount: likesArray.length,
                replyCount: replyCountMap.get(String(msg._id)) || 0,
                likedByCurrentUser: touristOid
                    ? likesArray.some((id) => touristOid.equals(id))
                    : false,
            };
        });

        return { total, page, limit, totalPages: Math.ceil(total / limit) || 1, data };
    }

    public async searchMessages(query: string, touristId?: string, limit = 20): Promise<any[]> {
        const messages = await Message.find({
            content: { $regex: query, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('author', 'firstName lastName')
            .lean();

        const touristOid = touristId ? new Types.ObjectId(touristId) : null;
        const messageIds = messages.map((m) => m._id);

        const replyCounts = await Reply.aggregate([
            { $match: { messageId: { $in: messageIds } } },
            { $group: { _id: '$messageId', count: { $sum: 1 } } }
        ]);
        const replyCountMap = new Map(replyCounts.map((r) => [String(r._id), r.count]));

        return messages.map((msg) => {
            const likesArray = msg.likes as any[] || [];
            return {
                ...msg,
                likeCount: likesArray.length,
                replyCount: replyCountMap.get(String(msg._id)) || 0,
                likedByCurrentUser: touristOid
                    ? likesArray.some((id) => touristOid.equals(id))
                    : false,
            };
        });
    }

    public async postMessage(authorId: string, content: string, attachments?: Array<{ type: 'image' | 'video'; url: string; caption?: string }>) {
        const doc = await Message.create({
            author: new Types.ObjectId(authorId),
            content: content.trim(),
            attachments,
            likes: []
        });
        return doc;
    }

    public async likeMessage(messageId: string, touristId: string) {
        const touristOid = new Types.ObjectId(touristId);

        const message = await Message.findById(messageId).select('likes').lean();
        if (!message) throw new Error('Message not found');

        const alreadyLiked = (message.likes as Types.ObjectId[]).some((id) => id.equals(touristOid));

        if (alreadyLiked) {
            await Message.findByIdAndUpdate(messageId, { $pull: { likes: touristOid } });
        } else {
            await Message.findByIdAndUpdate(messageId, { $addToSet: { likes: touristOid } });
        }

        const updated = await Message.findById(messageId).select('likes').lean();
        return { liked: !alreadyLiked, likeCount: (updated?.likes as any[])?.length || 0 };
    }

    public async listReplies(messageId: string, touristId?: string, page = 1, limit = 10): Promise<{ total: number; page: number; limit: number; totalPages: number; data: any[] }> {
        const skip = (page - 1) * limit;
        const [total, replies] = await Promise.all([
            Reply.countDocuments({ messageId }),
            Reply.find({ messageId })
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .populate('author', 'firstName lastName')
                .populate('likes', 'firstName lastName')
                .lean()
        ]);

        const touristOid = touristId ? new Types.ObjectId(touristId) : null;

        const data = replies.map((reply) => {
            const likesArray = reply.likes as any[] || [];
            return {
                ...reply,
                likeCount: likesArray.length,
                likedByCurrentUser: touristOid
                    ? likesArray.some((id) => touristOid.equals(id))
                    : false,
            };
        });

        return { total, page, limit, totalPages: Math.ceil(total / limit) || 1, data };
    }

    public async postReply(messageId: string, authorId: string, content: string) {
        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        const doc = await Reply.create({
            messageId: new Types.ObjectId(messageId),
            author: new Types.ObjectId(authorId),
            content: content.trim(),
            likes: []
        });
        return doc;
    }

    public async likeReply(replyId: string, touristId: string) {
        const touristOid = new Types.ObjectId(touristId);

        const reply = await Reply.findById(replyId).select('likes').lean();
        if (!reply) throw new Error('Reply not found');

        const alreadyLiked = (reply.likes as Types.ObjectId[]).some((id) => id.equals(touristOid));

        if (alreadyLiked) {
            await Reply.findByIdAndUpdate(replyId, { $pull: { likes: touristOid } });
        } else {
            await Reply.findByIdAndUpdate(replyId, { $addToSet: { likes: touristOid } });
        }

        const updated = await Reply.findById(replyId).select('likes').lean();
        return { liked: !alreadyLiked, likeCount: (updated?.likes as any[])?.length || 0 };
    }
}

export const communityService = new CommunityService();