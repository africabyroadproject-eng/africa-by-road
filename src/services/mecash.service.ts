//mecash.service.ts
import { Tourist } from '../models/tourist.model';

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
    private mode: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.MECASH_API_KEY || '';
        this.publicKey = process.env.MECASH_PUBLIC_KEY || '';
        this.mode = process.env.MECASH_MODE || 'sandbox';
        this.baseUrl = this.mode === 'sandbox'
            ? 'https://api-sandbox.me-cash.com/v1'
            : 'https://api.me-cash.com/v1';
    }

    public async initializePayment(request: MeCashPaymentRequest): Promise<MeCashPaymentResponse> {
        if (!this.apiKey) {
            console.warn('MeCash API key not configured - running in demo mode');
            return this.demoPayment(request);
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
            console.warn('MeCash API key not configured - running in demo mode');
            return {
                status: true,
                message: 'Demo verification',
                data: {
                    amount: 5000,
                    currency: 'NGN',
                    reference,
                    status: 'success',
                    customer: { email: 'demo@example.com' }
                }
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

    public async handleWebhook(event: any): Promise<void> {
        const { reference, status, customer } = event;

        if (status === 'success') {
            const tourist = await Tourist.findOne({ email: customer?.email });
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

    private demoPayment(request: MeCashPaymentRequest): MeCashPaymentResponse {
        const demoUrl = `demo://checkout?amount=${request.amount}&email=${request.email}&ref=${request.reference}`;
        return {
            status: true,
            message: 'Demo payment initiated',
            data: {
                paymentUrl: demoUrl,
                reference: request.reference
            }
        };
    }

    public getPublicKey(): string {
        return this.publicKey;
    }

    public isConfigured(): boolean {
        return !!this.apiKey;
    }
}

export const meCashService = new MeCashService();