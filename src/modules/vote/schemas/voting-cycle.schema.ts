import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VotingCycleStatus = 'pending' | 'active' | 'closed';

@Schema({ timestamps: true })
export class VotingCycle {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: ['pending', 'active', 'closed'], default: 'pending' })
  status: VotingCycleStatus;

  @Prop({ required: true })
  startedAt: Date;

  @Prop()
  closedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Admin', required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type VotingCycleDocument = HydratedDocument<VotingCycle>;

export const VotingCycleSchema = SchemaFactory.createForClass(VotingCycle);

// Only one active cycle allowed at a time (partial unique index)
VotingCycleSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
VotingCycleSchema.index({ startedAt: -1 });
VotingCycleSchema.index({ status: 1, startedAt: -1 });
