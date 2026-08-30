import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

/**
 * Persistent audit log entry for admin state-changing actions.
 * Replaces console-only logging with DB persistence.
 */
@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: true })
  adminId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  action: string;

  @Prop({ required: true, trim: true })
  module: string;

  @Prop({ required: true, trim: true })
  targetType: string;

  @Prop({ required: true, trim: true })
  targetId: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  previousValue?: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed })
  newValue?: Record<string, unknown>;

  @Prop({ trim: true })
  ipAddress?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ module: 1, createdAt: -1 });
AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });
