//contestant.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IContestant extends Document {
    name: string;
    country: string;
    bio: string;
    imageUrl: string;
    createdBy: Types.ObjectId;
    votes: number;
    status: 'pending' | 'active' | 'eliminated' | 'winner';
    createdAt: Date;
    updatedAt: Date;
}

const contestantSchema = new Schema<IContestant>(
    {
        name: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
        bio: { type: String, required: true },
        imageUrl: { type: String, required: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'Tourist', required: true },
        votes: { type: Number, default: 0 },
        status: { type: String, enum: ['pending', 'active', 'eliminated', 'winner'], default: 'pending' }
    },
    {
        timestamps: true
    }
);

contestantSchema.index({ votes: -1 });
contestantSchema.index({ status: 1 });

export const Contestant = mongoose.model<IContestant>('Contestant', contestantSchema);