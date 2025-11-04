import { Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { Tourist } from '../models/tourist.model';

export class PaymentsController {
    public async createCheckout(req: Request, res: Response): Promise<void> {
        try {
            const { email, fullName, phoneNumber, country, gateway } = req.body;

            if (!email || !fullName || !phoneNumber) {
                res.status(400).json({ message: 'Email, fullName, and phoneNumber are required' });
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

            // Update basic details before checkout
            const [firstName, ...rest] = fullName.trim().split(' ');
            tourist.firstName = firstName;
            tourist.lastName = rest.join(' ') || tourist.lastName;
            tourist.phoneNumber = phoneNumber;
            await tourist.save();

            const options = paymentService.getGatewayOptions(country);
            const chosenGateway = gateway || options.preferred;
            // Stub checkout URL generation
            const checkoutUrl = `https://checkout.example/${chosenGateway}?email=${encodeURIComponent(email)}&country=${options.country}`;

            res.status(200).json({
                message: 'Checkout initiated',
                data: {
                    checkoutUrl,
                    gateway: chosenGateway,
                    currency: options.currency
                }
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout';
            res.status(500).json({ message: 'Failed to create checkout', error: errorMessage });
            return;
        }
    }

    // Webhook: mark paid and contestant membership (removed Contestant model references)
    public async webhook(req: Request, res: Response): Promise<void> {
        try {
            const { email, status } = req.body;
            if (!email || status !== 'success') {
                res.status(400).json({ message: 'Invalid webhook payload' });
                return;
            }

            const tourist = await Tourist.findOne({ email });
            if (!tourist) {
                res.status(404).json({ message: 'Tourist not found' });
                return;
            }

            tourist.isPaid = true;
            tourist.isCommunityMember = true;
            tourist.isContestant = true;
            await tourist.save();

            res.status(200).json({ message: 'Payment processed' });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Webhook handling failed';
            res.status(500).json({ message: 'Webhook handling failed', error: errorMessage });
            return;
        }
    }
}