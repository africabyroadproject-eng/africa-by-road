import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

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

  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: 0 })
  votes: number;

  @Prop({ type: String, enum: ['pending', 'active', 'eliminated', 'winner'], default: 'pending' })
  status: 'pending' | 'active' | 'eliminated' | 'winner';

  createdAt: Date;
  updatedAt: Date;
}

export type ContestantDocument = HydratedDocument<Contestant>;

export const ContestantSchema = SchemaFactory.createForClass(Contestant);

ContestantSchema.index({ status: 1, votes: -1 });
ContestantSchema.index({ country: 1 });
