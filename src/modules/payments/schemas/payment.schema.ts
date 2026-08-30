import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PaymentProvider = 'mecash' | 'paystack' | 'flutterwave' | 'stripe';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

/**
 * Persistent payment ledger entry tracking every payment attempt
 * regardless of provider. Serves as the single source of truth for
 * payment history and prevents double-charging via idempotent lookups.
 */
@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  tourist: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['mecash', 'paystack', 'flutterwave', 'stripe'],
    required: true,
  })
  provider: PaymentProvider;

  @Prop({ required: true, trim: true })
  reference: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, trim: true, uppercase: true })
  currency: string;

  @Prop({
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending',
  })
  status: PaymentStatus;

  /** Provider-specific transaction ID (set after confirmation) */
  @Prop({ trim: true })
  providerTransactionId?: string;

  /** Flexible metadata from the payment provider */
  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, unknown>;

  /** Description/purpose of the payment */
  @Prop({ trim: true })
  description?: string;

  /** Timestamp when the payment was confirmed by the provider */
  @Prop()
  confirmedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type PaymentDocument = HydratedDocument<Payment>;

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ provider: 1, reference: 1 }, { unique: true });
PaymentSchema.index({ tourist: 1, createdAt: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ reference: 1 });
