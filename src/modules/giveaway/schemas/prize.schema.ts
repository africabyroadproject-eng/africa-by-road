import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class Prize {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  imageUrl?: string;

  /**
   * Remaining stock. Decremented atomically on each spin award.
   * When 0, this prize slot is treated as "out of stock".
   */
  @Prop({ required: true, min: 0 })
  quantity: number;

  /**
   * Relative probability weight (1–100). Higher weight = more likely to be selected.
   * The actual probability is `weight / sumOfAllActiveWeights`.
   */
  @Prop({ required: true, min: 1, max: 100, default: 10 })
  weight: number;

  /**
   * Slot position on the wheel (1–10). Must be unique across all prizes.
   */
  @Prop({ required: true, min: 1, max: 10 })
  position: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type PrizeDocument = HydratedDocument<Prize>;

export const PrizeSchema = SchemaFactory.createForClass(Prize);

PrizeSchema.index({ position: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
PrizeSchema.index({ isActive: 1, isDeleted: 1, quantity: 1 });
