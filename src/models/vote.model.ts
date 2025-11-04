//vote.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVote extends Document {
    tourist: Types.ObjectId;
    contestant: Types.ObjectId;
    voteDate: Date; // normalized to start-of-day
    createdAt: Date;
    updatedAt: Date;
}

const voteSchema = new Schema<IVote>(
    {
        tourist: { type: Schema.Types.ObjectId, ref: 'Tourist', required: true },
        contestant: { type: Schema.Types.ObjectId, ref: 'Contestant', required: true },
        voteDate: { type: Date, required: true }
    },
    { timestamps: true }
);

voteSchema.index({ tourist: 1, contestant: 1, voteDate: 1 }, { unique: true });

export const Vote = mongoose.model<IVote>('Vote', voteSchema);