import { Request, Response } from 'express';
import { communityService } from '../services/community.service';

export class CommunityController {
    public async getMessage(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const message = await communityService.getMessage(id, req.user?.id);
            res.status(200).json({ message: 'Message detail', data: message });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch message';
            const status = errMsg === 'Message not found' ? 404 : 500;
            res.status(status).json({ message: errMsg });
        }
    }

    public async listMessages(req: Request<{}, {}, {}, { page?: string; limit?: string }>, res: Response): Promise<void> {
        try {
            const page = Math.max(1, parseInt(req.query.page || '1', 10));
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
            const result = await communityService.listMessages(req.user?.id, page, limit);
            res.status(200).json({ message: 'Messages', ...result });
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
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }

            const { id } = req.params;
            const result = await communityService.likeMessage(id, req.user.id);
            res.status(200).json({ message: result.liked ? 'Liked' : 'Unliked', data: result });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to like message';
            res.status(400).json({ message: errMsg });
        }
    }

    public async searchMessages(req: Request<{}, {}, {}, { q?: string }>, res: Response): Promise<void> {
        try {
            const query = req.query.q;
            if (!query) {
                res.status(400).json({ message: 'Search query required' });
                return;
            }

            const messages = await communityService.searchMessages(query, req.user?.id, 20);
            res.status(200).json({ message: 'Search results', data: messages });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Search failed';
            res.status(500).json({ message: errMsg });
        }
    }

    public async listReplies(req: Request<{ id: string }, {}, {}, { page?: string; limit?: string }>, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const page = Math.max(1, parseInt(req.query.page || '1', 10));
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
            const result = await communityService.listReplies(id, req.user?.id, page, limit);
            res.status(200).json({ message: 'Replies', ...result });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch replies';
            res.status(500).json({ message: errMsg });
        }
    }

    public async postReply(req: Request<{ id: string }, {}, { content: string }>, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }

            const { id } = req.params;
            const { content } = req.body;

            if (!content || !content.trim()) {
                res.status(400).json({ message: 'Content is required' });
                return;
            }

            const reply = await communityService.postReply(id, req.user.id, content);
            res.status(201).json({ message: 'Reply posted', data: reply });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to post reply';
            res.status(400).json({ message: errMsg });
        }
    }

    public async likeReply(req: Request<{ id: string }>, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }

            const { id } = req.params;
            const result = await communityService.likeReply(id, req.user.id);
            res.status(200).json({ message: result.liked ? 'Liked' : 'Unliked', data: result });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to like reply';
            res.status(400).json({ message: errMsg });
        }
    }
}

export default CommunityController;