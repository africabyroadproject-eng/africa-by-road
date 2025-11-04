//giveawaySpin.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGiveawaySpin extends Document {
    tourist: Types.ObjectId;
    spinDate: Date; // normalized to start-of-day
    prize: string;
    createdAt: Date;
    updatedAt: Date;
}

const giveawaySpinSchema = new Schema<IGiveawaySpin>(
    {
        tourist: { type: Schema.Types.ObjectId, ref: 'Tourist', required: true },
        spinDate: { type: Date, required: true },
        prize: { type: String, required: true }
    },
    { timestamps: true }
);

giveawaySpinSchema.index({ tourist: 1, spinDate: 1 }, { unique: true });

export const GiveawaySpin = mongoose.model<IGiveawaySpin>('GiveawaySpin', giveawaySpinSchema);