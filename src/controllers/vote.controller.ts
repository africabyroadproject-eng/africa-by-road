import { Request, Response } from 'express';
import { voteService } from '../services/vote.service';

export class VoteController {
    public async listContestants(_req: Request, res: Response): Promise<void> {
        try {
            const contestants = await voteService.listContestants();
            res.status(200).json({ message: 'Contestants', data: contestants });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch contestants';
            res.status(500).json({ message: 'Failed to fetch contestants', error: errMsg });
        }
    }

    public async leaderboard(_req: Request, res: Response): Promise<void> {
        try {
            const leaderboard = await voteService.leaderboard(6);
            res.status(200).json({ message: 'Leaderboard', data: leaderboard });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch leaderboard';
            res.status(500).json({ message: 'Failed to fetch leaderboard', error: errMsg });
        }
    }

    public async voteFavorite(req: Request<{}, {}, { contestantId: string }>, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }

            const { contestantId } = req.body;
            if (!contestantId) {
                res.status(400).json({ message: 'contestantId is required' });
                return;
            }

            const result = await voteService.voteFavorite(req.user.id, contestantId);
            res.status(200).json({ message: result.message, data: { votes: result.votes } });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to cast vote';
            res.status(400).json({ message: errMsg });
        }
    }
}

export default VoteController;