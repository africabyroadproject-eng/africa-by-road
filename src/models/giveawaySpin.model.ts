//giveawaySpin.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGiveawaySpin extends Document {
    tourist: Types.ObjectId;
    gameType: 'spin' | 'trivia';
    spinDate: Date;
    prize: string;
    createdAt: Date;
    updatedAt: Date;
}

const giveawaySpinSchema = new Schema<IGiveawaySpin>(
    {
        tourist: { type: Schema.Types.ObjectId, ref: 'Tourist', required: true },
        gameType: { type: String, enum: ['spin', 'trivia'], default: 'spin' },
        spinDate: { type: Date, required: true },
        prize: { type: String, required: true }
    },
    { timestamps: true }
);

giveawaySpinSchema.index({ tourist: 1, gameType: 1, spinDate: 1 }, { unique: true });
giveawaySpinSchema.index({ spinDate: -1, prize: 1 });

export const GiveawaySpin = mongoose.model<IGiveawaySpin>('GiveawaySpin', giveawaySpinSchema);