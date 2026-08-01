import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TriviaResponse {
  @Prop({ type: Types.ObjectId, ref: 'Tourist', required: true })
  tourist: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TriviaQuestion', required: true })
  questionId: Types.ObjectId;

  @Prop({ required: true })
  selectedAnswer: number;

  @Prop({ required: true })
  isCorrect: boolean;

  @Prop({ default: Date.now })
  respondedAt: Date;

  @Prop({ required: true })
  triviaDate: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type TriviaResponseDocument = HydratedDocument<TriviaResponse>;

export const TriviaResponseSchema = SchemaFactory.createForClass(TriviaResponse);

TriviaResponseSchema.index({ tourist: 1, triviaDate: 1 }, { unique: true });
TriviaResponseSchema.index({ tourist: 1, respondedAt: 1 });
TriviaResponseSchema.index({ triviaDate: 1 });
