import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export interface StageHistoryEntry {
  fromStage: string;
  toStage: string;
  movedBy: Types.ObjectId;
  reason?: string;
  movedAt: Date;
}

@Schema({ timestamps: true })
export class Contestant {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  country: string;

  @Prop({ required: true })
  bio: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: false })
  createdBy?: Types.ObjectId;

  @Prop({ default: 0 })
  votes: number;

  @Prop({ type: String, enum: ['pending', 'active', 'eliminated', 'winner'], default: 'pending' })
  status: 'pending' | 'active' | 'eliminated' | 'winner';

  @Prop({
    type: String,
    enum: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Final'],
    default: 'Stage 1',
  })
  currentStage: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Final';

  @Prop()
  eliminatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'VotingCycle' })
  eliminatedInCycle?: Types.ObjectId;

  @Prop({
    type: [
      {
        fromStage: { type: String, required: true },
        toStage: { type: String, required: true },
        movedBy: { type: Types.ObjectId, ref: 'Admin', required: true },
        reason: { type: String },
        movedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  stageHistory: StageHistoryEntry[];

  createdAt: Date;
  updatedAt: Date;
}

export type ContestantDocument = HydratedDocument<Contestant>;

export const ContestantSchema = SchemaFactory.createForClass(Contestant);

ContestantSchema.index({ status: 1, votes: -1 });
ContestantSchema.index({ country: 1 });
ContestantSchema.index({ currentStage: 1, status: 1 });


