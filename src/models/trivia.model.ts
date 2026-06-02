//trivia.model.ts
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITriviaQuestion extends Document {
    question: string;
    options: string[];
    correctAnswer: number;
    category: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITriviaResponse extends Document {
    tourist: Types.ObjectId;
    questionId: Types.ObjectId;
    selectedAnswer: number;
    isCorrect: boolean;
    respondedAt: Date;
    triviaDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const triviaQuestionSchema = new Schema<ITriviaQuestion>(
    {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        category: { type: String, default: 'general' },
        isActive: { type: Boolean, default: true }
    },
    { timestamps: true }
);

const triviaResponseSchema = new Schema<ITriviaResponse>(
    {
        tourist: { type: Schema.Types.ObjectId, ref: 'Tourist', required: true },
        questionId: { type: Schema.Types.ObjectId, ref: 'TriviaQuestion', required: true },
        selectedAnswer: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
        respondedAt: { type: Date, default: Date.now },
        triviaDate: { type: Date, required: true }
    },
    { timestamps: true }
);

triviaQuestionSchema.index({ isActive: 1 });
triviaQuestionSchema.index({ category: 1, isActive: 1 });

triviaResponseSchema.index({ tourist: 1, triviaDate: 1 }, { unique: true });
triviaResponseSchema.index({ tourist: 1, respondedAt: 1 });
triviaResponseSchema.index({ triviaDate: 1 });

export const TriviaQuestion = mongoose.model<ITriviaQuestion>('TriviaQuestion', triviaQuestionSchema);
export const TriviaResponse = mongoose.model<ITriviaResponse>('TriviaResponse', triviaResponseSchema);