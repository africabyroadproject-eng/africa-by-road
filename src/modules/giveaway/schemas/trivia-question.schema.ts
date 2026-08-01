import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class TriviaQuestion {
  @Prop({ required: true })
  question: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ required: true })
  correctAnswer: number;

  @Prop({ default: 'general' })
  category: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type TriviaQuestionDocument = HydratedDocument<TriviaQuestion>;

export const TriviaQuestionSchema = SchemaFactory.createForClass(TriviaQuestion);

TriviaQuestionSchema.index({ isActive: 1 });
TriviaQuestionSchema.index({ category: 1, isActive: 1 });
