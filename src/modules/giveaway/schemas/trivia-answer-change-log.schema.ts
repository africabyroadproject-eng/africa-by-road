import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/**
 * Tracks when a trivia question's correct answer is changed after
 * user submissions already exist (PRD requirement TRI-005).
 */
@Schema({ timestamps: true })
export class TriviaAnswerChangeLog {
  @Prop({ type: Types.ObjectId, ref: 'TriviaQuestion', required: true })
  questionId: Types.ObjectId;

  @Prop({ required: true })
  previousCorrectAnswer: number;

  @Prop({ required: true })
  newCorrectAnswer: number;

  @Prop({ type: Types.ObjectId, ref: 'Admin', required: true })
  changedBy: Types.ObjectId;

  @Prop()
  reason?: string;

  /** Number of existing TriviaResponse records at the time of the change */
  @Prop({ required: true })
  affectedResponseCount: number;

  @Prop({ required: true, default: Date.now })
  changedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type TriviaAnswerChangeLogDocument = HydratedDocument<TriviaAnswerChangeLog>;

export const TriviaAnswerChangeLogSchema = SchemaFactory.createForClass(TriviaAnswerChangeLog);

TriviaAnswerChangeLogSchema.index({ questionId: 1, changedAt: -1 });
TriviaAnswerChangeLogSchema.index({ changedBy: 1 });
