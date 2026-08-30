import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Immutable record of a prize awarded to a tourist.
 *
 * Captures a snapshot of the prize at the moment of award so that
 * future edits to the Prize document don't retroactively change history.
 */
@Schema({ timestamps: true })
export class PrizeSnapshot {
  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  tourist: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Prize', required: true })
  prize: Types.ObjectId;

  /** Prize name at the time of award */
  @Prop({ required: true })
  prizeNameSnapshot: string;

  /** Prize description at the time of award */
  @Prop()
  prizeDescriptionSnapshot?: string;

  /** Prize image URL at the time of award */
  @Prop()
  prizeImageUrlSnapshot?: string;

  /** Position on the wheel at the time of award */
  @Prop()
  prizePositionSnapshot?: number;

  @Prop({ required: true, default: Date.now })
  awardedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type PrizeSnapshotDocument = HydratedDocument<PrizeSnapshot>;

export const PrizeSnapshotSchema = SchemaFactory.createForClass(PrizeSnapshot);

PrizeSnapshotSchema.index({ tourist: 1, awardedAt: -1 });
PrizeSnapshotSchema.index({ prize: 1 });
PrizeSnapshotSchema.index({ awardedAt: -1 });
