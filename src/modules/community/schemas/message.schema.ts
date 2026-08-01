import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export interface IAttachment {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

@Schema()
class Attachment implements IAttachment {
  @Prop({ type: String, enum: ['image', 'video'], required: true })
  type: 'image' | 'video';

  @Prop({ required: true })
  url: string;

  @Prop()
  caption?: string;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [Attachment] })
  attachments?: IAttachment[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tourist' }], default: [] })
  likes: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export type MessageDocument = HydratedDocument<Message>;

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ createdAt: -1 });
MessageSchema.index({ author: 1, createdAt: -1 });
