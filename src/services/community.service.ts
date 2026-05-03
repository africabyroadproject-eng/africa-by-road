import { Message } from '../models/message.model';
import { Reply } from '../models/reply.model';
import { Types } from 'mongoose';

class CommunityService {
    public async listMessages(touristId?: string, limit = 20): Promise<any[]> {
        const messages = await Message.find({})
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('author', 'firstName lastName')
            .populate('likes', 'firstName lastName')
            .lean();

        const touristOid = touristId ? new Types.ObjectId(touristId) : null;

        const results = [];
        for (const msg of messages) {
            const likesArray = msg.likes as any[] || [];
            const hasLiked = touristOid
                ? likesArray.some((id) => touristOid.equals(id))
                : false;
            const replyCount = await Reply.countDocuments({ messageId: msg._id });
            results.push({
                ...msg,
                likeCount: likesArray.length,
                replyCount,
                likedByCurrentUser: hasLiked,
            });
        }
        return results;
    }

    public async searchMessages(query: string, limit = 20): Promise<any[]> {
        const messages = await Message.find({
            content: { $regex: query, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('author', 'firstName lastName')
            .lean();

        return messages.map((msg) => ({
            ...msg,
            likeCount: msg.likes?.length || 0,
        }));
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
        const message = await Message.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        const touristOid = new Types.ObjectId(touristId);
        const likesArray = message.likes as Types.ObjectId[];
        const alreadyLiked = likesArray.some((id) => id.equals(touristOid));

        if (alreadyLiked) {
            message.likes = likesArray.filter((id) => !id.equals(touristOid));
        } else {
            likesArray.push(touristOid);
            message.likes = likesArray;
        }

        await message.save();
        return { liked: !alreadyLiked, likeCount: message.likes.length };
    }

    public async listReplies(messageId: string, touristId?: string, limit = 10): Promise<any[]> {
        const replies = await Reply.find({ messageId })
            .sort({ createdAt: 1 })
            .limit(limit)
            .populate('author', 'firstName lastName')
            .populate('likes', 'firstName lastName')
            .lean();

        const touristOid = touristId ? new Types.ObjectId(touristId) : null;

        return replies.map((reply) => {
            const likesArray = reply.likes as any[] || [];
            return {
                ...reply,
                likeCount: likesArray.length,
                likedByCurrentUser: touristOid
                    ? likesArray.some((id) => touristOid.equals(id))
                    : false,
            };
        });
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
        const reply = await Reply.findById(replyId);
        if (!reply) {
            throw new Error('Reply not found');
        }

        const touristOid = new Types.ObjectId(touristId);
        const likesArray = reply.likes as Types.ObjectId[];
        const alreadyLiked = likesArray.some((id) => id.equals(touristOid));

        if (alreadyLiked) {
            reply.likes = likesArray.filter((id) => !id.equals(touristOid));
        } else {
            likesArray.push(touristOid);
            reply.likes = likesArray;
        }

        await reply.save();
        return { liked: !alreadyLiked, likeCount: reply.likes.length };
    }
}

export const communityService = new CommunityService();