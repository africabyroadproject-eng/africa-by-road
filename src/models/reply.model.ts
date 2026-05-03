//reply.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IReply extends Document {
    messageId: Types.ObjectId;
    author: Types.ObjectId;
    content: string;
    likes: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const replySchema = new Schema<IReply>(
    {
        messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
        author: { type: Schema.Types.ObjectId, ref: 'Tourist', required: true },
        content: { type: String, required: true },
        likes: [{ type: Schema.Types.ObjectId, ref: 'Tourist' }]
    },
    { timestamps: true }
);

replySchema.index({ messageId: 1, createdAt: -1 });

export const Reply = mongoose.model<IReply>('Reply', replySchema);