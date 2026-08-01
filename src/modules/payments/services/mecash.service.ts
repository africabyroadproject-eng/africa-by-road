import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { Tourist, TouristDocument } from '../../auth/schemas/tourist.schema';

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
    customer: { email: string };
  };
}

interface MeCashWebhookEvent {
  reference: string;
  status: string;
  customer?: { email?: string };
}

@Injectable()
export class MeCashService {
  private readonly logger = new Logger(MeCashService.name);
  private readonly apiKey: string;
  private readonly publicKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
  ) {
    this.apiKey = configService.get<string>('MECASH_API_KEY') || '';
    this.publicKey = configService.get<string>('MECASH_PUBLIC_KEY') || '';
    this.webhookSecret = configService.get<string>('MECASH_WEBHOOK_SECRET') || '';
    const mode = configService.get<string>('MECASH_MODE') || 'sandbox';
    this.baseUrl = mode === 'sandbox' ? 'https://api-sandbox.me-cash.com/v1' : 'https://api.me-cash.com/v1';
  }

  async initializePayment(request: MeCashPaymentRequest): Promise<MeCashPaymentResponse> {
    if (!this.apiKey) {
      return { status: false, message: 'MeCash API key is not configured. Set MECASH_API_KEY environment variable.' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/initiate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency,
          email: request.email,
          reference: request.reference,
          callback_url: request.callbackUrl,
          description: request.description || 'Africa By Road Registration',
        }),
      });
      return await response.json();
    } catch (error) {
      this.logger.error('MeCash payment initialization failed:', error as Error);
      return { status: false, message: 'Payment initialization failed' };
    }
  }

  async verifyPayment(reference: string): Promise<MeCashVerificationResponse> {
    if (!this.apiKey) {
      return { status: false, message: 'MeCash API key is not configured. Set MECASH_API_KEY environment variable.' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments/verify/${reference}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      });
      return await response.json();
    } catch (error) {
      this.logger.error('MeCash payment verification failed:', error as Error);
      return { status: false, message: 'Payment verification failed' };
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.error('MECASH_WEBHOOK_SECRET is not configured');
      return false;
    }
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');
    return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  async handleWebhook(event: MeCashWebhookEvent): Promise<void> {
    const { reference, status } = event;
    if (!reference || status !== 'success') return;

    const verified = await this.verifyPayment(reference);
    if (!verified.status || !verified.data) {
      throw new ServiceUnavailableException('Unable to verify payment with provider');
    }
    const data = verified.data;
    if (data.status !== 'success' || data.reference !== reference || data.amount !== 5000 || data.currency !== 'NGN') {
      throw new BadRequestException('Payment verification details do not match');
    }

    const email = data.customer?.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Verified payment has no customer email');

    const tourist = await this.touristModel.findOne({ email });
    if (tourist) {
      tourist.isPaid = true;
      tourist.paymentReference = reference;
      tourist.paymentDate = new Date();
      tourist.isCommunityMember = true;
      await tourist.save();
    }
  }

  generateReference(): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `ABR_${timestamp}_${random}`;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
