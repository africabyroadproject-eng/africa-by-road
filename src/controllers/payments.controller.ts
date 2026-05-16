import { Request, Response } from 'express';
import { meCashService } from '../services/mecash.service';
import { Tourist } from '../models/tourist.model';

export class PaymentsController {
    public async createCheckout(req: Request, res: Response): Promise<void> {
        try {
            const { email, phoneNumber } = req.body;

            if (!email) {
                res.status(400).json({ message: 'Email is required' });
                return;
            }

            const tourist = await Tourist.findOne({ email });
            if (!tourist) {
                res.status(404).json({ message: 'Account not found. Please register first.' });
                return;
            }

            if (!tourist.isEmailVerified) {
                res.status(400).json({ message: 'Please verify your email before payment' });
                return;
            }

            if (phoneNumber) {
                tourist.phoneNumber = phoneNumber;
                await tourist.save();
            }

            const reference = meCashService.generateReference();
            const callbackUrl = process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000/api/payments/callback';

            const result = await meCashService.initializePayment({
                amount: 5000,
                currency: 'NGN',
                email,
                reference,
                callbackUrl,
                description: 'Africa By Road Registration - $50 USD'
            });

            if (!result.status) {
                res.status(500).json({ message: result.message || 'Failed to initiate payment' });
                return;
            }

            res.status(200).json({
                message: 'Checkout initiated',
                data: {
                    checkoutUrl: result.data?.paymentUrl,
                    reference: result.data?.reference,
                    amount: 5000,
                    currency: 'NGN'
                }
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout';
            res.status(500).json({ message: 'Failed to create checkout', error: errorMessage });
            return;
        }
    }

    public async verifyPayment(req: Request<{}, {}, { reference: string }>, res: Response): Promise<void> {
        try {
            const { reference } = req.body;
            if (!reference) {
                res.status(400).json({ message: 'Reference is required' });
                return;
            }

            const result = await meCashService.verifyPayment(reference);

            res.status(200).json({
                message: result.status ? 'Payment verified' : 'Payment not found',
                data: result.data
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Verification failed';
            res.status(500).json({ message: errorMessage });
            return;
        }
    }

    public async webhook(req: Request, res: Response): Promise<void> {
        try {
            await meCashService.handleWebhook(req.body);
            res.status(200).json({ message: 'Webhook processed' });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Webhook handling failed';
            res.status(500).json({ message: 'Webhook handling failed', error: errorMessage });
            return;
        }
    }

    public async getPublicKey(_req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({
                data: {
                    publicKey: meCashService.getPublicKey(),
                    isConfigured: meCashService.isConfigured()
                }
            });
            return;
        } catch (error) {
            res.status(500).json({ message: 'Failed to get public key' });
        }
    }
}