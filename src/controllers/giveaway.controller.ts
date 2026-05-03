import { Request, Response } from 'express';
import { giveawayService } from '../services/giveaway.service';

export class GiveawayController {
    public async spinStatus(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const status = await giveawayService.spinStatus(req.user.id);
            res.status(200).json({ message: 'Spin status', data: status });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch spin status';
            res.status(500).json({ message: 'Failed to fetch spin status', error: errMsg });
        }
    }

    public async spin(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const result = await giveawayService.spin(req.user.id);
            res.status(200).json({ message: 'Spin success', data: result });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to spin';
            res.status(400).json({ message: errMsg });
        }
    }

    public async getTriviaQuestion(req: Request, res: Response): Promise<void> {
        try {
            const question = await giveawayService.getTriviaQuestion();
            res.status(200).json({ message: 'Trivia question', data: question });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to get trivia';
            res.status(500).json({ message: errMsg });
        }
    }

    public async submitTrivia(req: Request<{}, {}, { questionId: string; selectedAnswer: number }>, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const { questionId, selectedAnswer } = req.body;
            const result = await giveawayService.submitTriviaAnswer(req.user.id, questionId, selectedAnswer);
            res.status(200).json({ message: 'Trivia submitted', data: result });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to submit trivia';
            res.status(400).json({ message: errMsg });
        }
    }

    public async getTodaysWinners(req: Request, res: Response): Promise<void> {
        try {
            const winners = await giveawayService.getTodaysWinners();
            res.status(200).json({ message: "Today's winners", data: winners });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to get winners';
            res.status(500).json({ message: errMsg });
        }
    }
}

export default GiveawayController;