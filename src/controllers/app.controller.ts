import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';

export class AppController {
    public async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' });
                return;
            }
            const data = await dashboardService.getDashboard(req.user.id);
            res.status(200).json({
                message: 'Dashboard retrieved successfully',
                data
            });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch dashboard';
            res.status(500).json({ message: 'Failed to fetch dashboard', error: errMsg });
        }
    }
}

export default AppController;