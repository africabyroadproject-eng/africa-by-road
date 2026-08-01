import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Reply {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  messageId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tourist' }], default: [] })
  likes: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export type ReplyDocument = HydratedDocument<Reply>;

export const ReplySchema = SchemaFactory.createForClass(Reply);

ReplySchema.index({ messageId: 1, createdAt: -1 });
ReplySchema.index({ author: 1, createdAt: -1 });
