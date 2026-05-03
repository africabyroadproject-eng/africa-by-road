//message.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttachment {
    type: 'image' | 'video';
    url: string;
    caption?: string;
}

export interface IMessage extends Document {
    author: Types.ObjectId;
    content: string;
    attachments?: IAttachment[];
    likes: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>({
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
    caption: { type: String }
});

const messageSchema = new Schema<IMessage>(
    {
        author: { type: Schema.Types.ObjectId, ref: 'Tourist', required: true },
        content: { type: String, required: true },
        attachments: [attachmentSchema],
        likes: [{ type: Schema.Types.ObjectId, ref: 'Tourist' }]
    },
    { timestamps: true }
);

messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);