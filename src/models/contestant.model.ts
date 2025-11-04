//contestant.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IContestant extends Document {
    name: string;
    country: string;
    bio: string;
    votes: number;
    imageUrl: string;
    status: 'active' | 'eliminated' | 'winner';
    createdAt: Date;
    updatedAt: Date;
}

const contestantSchema = new Schema<IContestant>(
    {
        name: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
        bio: { type: String, required: true },
        votes: { type: Number, default: 0 },
        imageUrl: { type: String, required: true },
        status: { type: String, enum: ['active', 'eliminated', 'winner'], default: 'active' }
    },
    { timestamps: true }
);

contestantSchema.index({ votes: -1 });
contestantSchema.index({ status: 1 });

export const Contestant = mongoose.model<IContestant>('Contestant', contestantSchema);