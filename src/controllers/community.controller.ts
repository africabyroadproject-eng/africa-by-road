import { Request, Response } from 'express';
import { communityService } from '../services/community.service';

export class CommunityController {
    public async listMessages(_req: Request, res: Response): Promise<void> {
        try {
            const messages = await communityService.listMessages(20);
            res.status(200).json({ message: 'Messages', data: messages });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch messages';
            res.status(500).json({ message: 'Failed to fetch messages', error: errMsg });
        }
    }

    public async postMessage(req: Request<{}, {}, { content: string; attachments?: Array<{ type: 'image' | 'video'; url: string; caption?: string }> }>, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }

            const { content, attachments } = req.body;
            if (!content || !content.trim()) {
                res.status(400).json({ message: 'content is required' });
                return;
            }

            const msg = await communityService.postMessage(req.user.id, content, attachments);
            res.status(201).json({ message: 'Message posted', data: msg });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to post message';
            res.status(400).json({ message: errMsg });
        }
    }

    public async likeMessage(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updated = await communityService.likeMessage(id);
            if (!updated) {
                res.status(404).json({ message: 'Message not found' });
                return;
            }
            res.status(200).json({ message: 'Liked', data: { reactionLikes: updated.reactionLikes } });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to like message';
            res.status(400).json({ message: errMsg });
        }
    }
}

export default CommunityController;