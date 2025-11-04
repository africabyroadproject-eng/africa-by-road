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
}

export default GiveawayController;