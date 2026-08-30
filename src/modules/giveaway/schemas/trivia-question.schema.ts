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

  /**
   * Optional start of the active answering window.
   * If set, answers submitted before this date are rejected.
   */
  @Prop()
  periodStart?: Date;

  /**
   * Optional end of the active answering window.
   * If set, answers submitted after this date are rejected.
   */
  @Prop()
  periodEnd?: Date;

  /** Soft-delete flag for admin trivia management */
  @Prop({ default: false })
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export type TriviaQuestionDocument = HydratedDocument<TriviaQuestion>;

export const TriviaQuestionSchema = SchemaFactory.createForClass(TriviaQuestion);

TriviaQuestionSchema.index({ isActive: 1, isDeleted: 1 });
TriviaQuestionSchema.index({ category: 1, isActive: 1, isDeleted: 1 });
TriviaQuestionSchema.index({ periodStart: 1, periodEnd: 1, isActive: 1 });
