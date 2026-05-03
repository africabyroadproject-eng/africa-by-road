import { Tourist } from '../models/tourist.model';

export interface PaystackTransaction {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer: {
        email: string;
        phone?: string;
    };
    paymentmethod: string;
    created_at: string;
}

export interface InitializePaymentResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

export interface VerifyPaymentResponse {
    status: boolean;
    message: string;
    data: {
        id: number;
        status: string;
        reference: string;
        amount: number;
        currency: string;
    };
}

class PaystackService {
    private secretKey: string;
    private baseUrl = 'https://api.paystack.co';
    private usedIdempotencyKeys = new Map<string, { response: InitializePaymentResponse; timestamp: number }>();

    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    }

    public async initializePayment(
        email: string,
        amount: number,
        currency: string = 'USD',
        reference: string,
        idempotencyKey?: string
    ): Promise<InitializePaymentResponse> {
        const key = idempotencyKey || this.generateIdempotencyKey(email, reference);
        const cached = this.usedIdempotencyKeys.get(key);

        if (cached && Date.now() - cached.timestamp < 3600000) {
            return cached.response;
        }

        const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': key
            },
            body: JSON.stringify({
                email,
                amount: currency === 'USD' ? amount * 100 : amount,
                currency,
                reference,
                callback_url: process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000/api/payments/callback',
                metadata: {
                    userEmail: email,
                    reference,
                    idempotencyKey: key
                }
            })
        });

        const result = await response.json();

        if (result.status) {
            this.usedIdempotencyKeys.set(key, { response: result, timestamp: Date.now() });
        }

        return result;
    }

    public generateIdempotencyKey(email: string, reference: string): string {
        return `IDEM_${email}_${reference}_${Date.now()}`;
    }

    public clearIdempotencyKey(key: string): void {
        this.usedIdempotencyKeys.delete(key);
    }

    public async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
        const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.secretKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.json();
    }

    public async handleWebhook(event: string, data: PaystackTransaction): Promise<void> {
        if (event === 'charge.success' && data.status === 'success') {
            const email = data.customer?.email;
            const reference = data.reference;

            if (!email) return;

            const tourist = await Tourist.findOne({ email });
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
}

export const paystackService = new PaystackService();