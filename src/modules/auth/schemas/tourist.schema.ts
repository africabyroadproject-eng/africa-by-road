import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export interface IDocumentUpload {
  name: string;
  url?: string;
  storageKey?: string;
  resourceType?: string;
  format?: string;
  bytes?: number;
  uploadedAt?: Date;
}

export interface ISocialMedia {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
}

@Schema({ timestamps: true })
export class Tourist {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ trim: true })
  middleName?: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ trim: true })
  nationality?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  residentialAddress?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ type: String, default: 'tourist', enum: ['tourist'] })
  role: 'tourist';

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpires?: Date;

  @Prop({ select: false })
  emailOtpCode?: string;

  @Prop({ select: false })
  emailOtpExpires?: Date;

  @Prop({ select: false, default: 0 })
  emailOtpAttempts?: number;

  @Prop({ type: String, enum: ['password', 'google'], default: 'password' })
  authProvider?: 'password' | 'google';

  @Prop({ default: false })
  isPaid?: boolean;

  @Prop()
  paymentReference?: string;

  @Prop()
  paymentDate?: Date;

  @Prop({ default: false })
  isCommunityMember?: boolean;

  @Prop({ default: false })
  isOnboarded?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Contestant' })
  contestantProfile?: Types.ObjectId;

  @Prop({
    type: {
      instagram: String,
      facebook: String,
      twitter: String,
      tiktok: String,
      youtube: String,
    },
  })
  socialMedia?: ISocialMedia;

  @Prop({ type: { name: String, url: String, storageKey: String, resourceType: String, format: String, bytes: Number, uploadedAt: Date } })
  governmentId?: IDocumentUpload;

  @Prop({ type: { name: String, url: String, storageKey: String, resourceType: String, format: String, bytes: Number, uploadedAt: Date } })
  proofOfAddress?: IDocumentUpload;

  @Prop({ type: { name: String, url: String, storageKey: String, resourceType: String, format: String, bytes: Number, uploadedAt: Date } })
  medicalRecords?: IDocumentUpload;

  @Prop({ type: String, enum: ['pending', 'in_progress', 'complete'], default: 'pending' })
  registrationStatus: 'pending' | 'in_progress' | 'complete';

  @Prop({ default: 1 })
  qualificationStep?: number;

  @Prop({ default: false })
  assessmentCompleted?: boolean;

  @Prop({ type: [String], default: [] })
  completedSteps?: string[];

  @Prop({ type: Object, default: {} })
  assessmentAnswers?: Record<string, any>;

  @Prop({ default: false })
  isBlocked?: boolean;

  @Prop()
  blockedAt?: Date;

  @Prop()
  blockedReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export type TouristDocument = HydratedDocument<Tourist>;

export const TouristSchema = SchemaFactory.createForClass(Tourist);

TouristSchema.index({ passwordResetToken: 1 });
TouristSchema.index({ emailOtpCode: 1, emailOtpExpires: 1 });
TouristSchema.index({ authProvider: 1 });
TouristSchema.index({ registrationStatus: 1 });
TouristSchema.index({ isPaid: 1 });
TouristSchema.index({ isEmailVerified: 1 });
TouristSchema.index({ isBlocked: 1 });
TouristSchema.index({ qualificationStep: 1 });

