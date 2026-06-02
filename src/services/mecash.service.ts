//mecash.service.ts
import { Tourist } from '../models/tourist.model';

import crypto from 'crypto';

export interface MeCashPaymentRequest {
    amount: number;
    currency: string;
    email: string;
    reference: string;
    callbackUrl: string;
    description?: string;
}

export interface MeCashPaymentResponse {
    status: boolean;
    message: string;
    data?: {
        paymentUrl: string;
        reference: string;
    };
}

export interface MeCashVerificationResponse {
    status: boolean;
    message: string;
    data?: {
        amount: number;
        currency: string;
        reference: string;
        status: 'success' | 'pending' | 'failed';
        customer: {
            email: string;
        };
    };
}

class MeCashService {
    private apiKey: string;
    private publicKey: string;
    private webhookSecret: string;
    private mode: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.MECASH_API_KEY || '';
        this.publicKey = process.env.MECASH_PUBLIC_KEY || '';
        this.webhookSecret = process.env.MECASH_WEBHOOK_SECRET || '';
        this.mode = process.env.MECASH_MODE || 'sandbox';
        this.baseUrl = this.mode === 'sandbox'
            ? 'https://api-sandbox.me-cash.com/v1'
            : 'https://api.me-cash.com/v1';
    }

    public async initializePayment(request: MeCashPaymentRequest): Promise<MeCashPaymentResponse> {
        if (!this.apiKey) {
            return {
                status: false,
                message: 'MeCash API key is not configured. Set MECASH_API_KEY environment variable.'
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/payments/initiate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: request.amount,
                    currency: request.currency,
                    email: request.email,
                    reference: request.reference,
                    callback_url: request.callbackUrl,
                    description: request.description || 'Africa By Road Registration'
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('MeCash payment initialization failed:', error);
            return {
                status: false,
                message: 'Payment initialization failed'
            };
        }
    }

    public async verifyPayment(reference: string): Promise<MeCashVerificationResponse> {
        if (!this.apiKey) {
            return {
                status: false,
                message: 'MeCash API key is not configured. Set MECASH_API_KEY environment variable.'
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/payments/verify/${reference}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('MeCash payment verification failed:', error);
            return {
                status: false,
                message: 'Payment verification failed'
            };
        }
    }

    public verifyWebhookSignature(rawBody: string, signature: string): boolean {
        if (!this.webhookSecret) {
            console.warn('MECASH_WEBHOOK_SECRET not set — webhook signature verification skipped');
            return true;
        }
        const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }

    public async handleWebhook(event: any): Promise<void> {
        const { reference, status, customer } = event;

        if (!customer?.email) {
            console.warn('Webhook received without customer email — skipping');
            return;
        }

        if (status === 'success') {
            const tourist = await Tourist.findOne({ email: customer.email });
            if (tourist) {
                tourist.isPaid = true;
                tourist.paymentReference = reference;
                tourist.paymentDate = new Date();
                tourist.isCommunityMember = true;
                if (tourist.registrationStatus === 'in_progress') {
                    tourist.registrationStatus = 'complete';
                }
                await tourist.save();
            }
        }
    }

    public generateReference(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 10);
        return `ABR_${timestamp}_${random}`;
    }

    public getPublicKey(): string {
        return this.publicKey;
    }

    public isConfigured(): boolean {
        return !!this.apiKey;
    }
}

export const meCashService = new MeCashService();