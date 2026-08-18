import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Vote {
  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  tourist: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Contestant', required: true })
  contestant: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'VotingCycle' })
  votingCycle?: Types.ObjectId;

  @Prop({ required: true })
  voteDate: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type VoteDocument = HydratedDocument<Vote>;

export const VoteSchema = SchemaFactory.createForClass(Vote);

VoteSchema.index({ tourist: 1, contestant: 1, voteDate: 1 }, { unique: true });
VoteSchema.index({ tourist: 1, voteDate: 1 });
VoteSchema.index({ contestant: 1, voteDate: 1 });
VoteSchema.index({ votingCycle: 1, contestant: 1 });

