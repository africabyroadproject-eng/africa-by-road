import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class GiveawaySpin {
  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  tourist: Types.ObjectId;

  @Prop({ type: String, enum: ['spin', 'trivia'], default: 'spin' })
  gameType: 'spin' | 'trivia';

  @Prop({ required: true })
  spinDate: Date;

  @Prop({ required: true })
  prize: string;

  createdAt: Date;
  updatedAt: Date;
}

export type GiveawaySpinDocument = HydratedDocument<GiveawaySpin>;

export const GiveawaySpinSchema = SchemaFactory.createForClass(GiveawaySpin);

GiveawaySpinSchema.index({ tourist: 1, gameType: 1, spinDate: 1 }, { unique: true });
GiveawaySpinSchema.index({ spinDate: -1, prize: 1 });
GiveawaySpinSchema.index({ tourist: 1, spinDate: -1 });
