import { Request, Response } from 'express';
import { contentService } from '../services/content.service';
import { paymentService } from '../services/payment.service';

export class PublicController {
    public async getLandingPage(_req: Request, res: Response): Promise<void> {
        try {
            const content = contentService.getLandingPageContent();
            res.status(200).json({
                message: 'Landing page content retrieved successfully',
                data: content
            });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch landing page content';
            res.status(500).json({ message: 'Failed to fetch landing page content', error: errMsg });
        }
    }
    public async getPaymentGatewayOptions(req: Request<{}, {}, {}, { country?: string }>, res: Response): Promise<void> {
        try {
            const { country } = req.query;
            const options = paymentService.getGatewayOptions(country);
            res.status(200).json({
                message: 'Payment gateway options retrieved successfully',
                data: options
            });
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Failed to fetch payment gateway options';
            res.status(500).json({ message: 'Failed to fetch payment gateway options', error: errMsg });
        }
    }
}

export default PublicController;