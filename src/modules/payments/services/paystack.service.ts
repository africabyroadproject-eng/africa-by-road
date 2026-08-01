import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { Tourist, TouristDocument } from '../../auth/schemas/tourist.schema';

export interface PaystackTransaction {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string; phone?: string };
  paymentmethod: string;
  created_at: string;
}

export interface InitializePaymentResponse {
  status: boolean;
  message: string;
  data: { authorization_url: string; access_code: string; reference: string };
}

export interface VerifyPaymentResponse {
  status: boolean;
  message: string;
  data: { id: number; status: string; reference: string; amount: number; currency: string };
}

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly usedIdempotencyKeys = new Map<string, { response: InitializePaymentResponse; timestamp: number }>();

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
  ) {
    this.secretKey = configService.get<string>('PAYSTACK_SECRET_KEY') || '';
  }

  async initializePayment(
    email: string,
    amount: number,
    currency = 'USD',
    reference?: string,
    idempotencyKey?: string,
  ): Promise<InitializePaymentResponse> {
    const key = idempotencyKey || this.generateIdempotencyKey(email, reference || '');
    const cached = this.usedIdempotencyKeys.get(key);

    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.response;
    }

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({
        email,
        amount: amount * 100,
        currency,
        reference,
        callback_url: this.configService.get<string>('PAYMENT_CALLBACK_URL') || 'http://localhost:3000/api/payments/callback',
        metadata: { userEmail: email, reference, idempotencyKey: key },
      }),
    });

    const result = await response.json();
    if (result.status) {
      this.usedIdempotencyKeys.set(key, { response: result, timestamp: Date.now() });
    }
    return result;
  }

  generateIdempotencyKey(email: string, reference: string): string {
    return `IDEM_${email}_${reference}`;
  }

  clearIdempotencyKey(key: string): void {
    this.usedIdempotencyKeys.delete(key);
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' },
    });
    return response.json();
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.secretKey) return false;
    const expected = createHmac('sha256', this.secretKey).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  async handleWebhook(event: string, data: PaystackTransaction): Promise<void> {
    if (event === 'charge.success' && data.status === 'success') {
      const email = data.customer?.email;
      const reference = data.reference;
      if (!email) return;

      const tourist = await this.touristModel.findOne({ email });
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

  generateReference(): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `ABR_${timestamp}_${random}`;
  }
}
