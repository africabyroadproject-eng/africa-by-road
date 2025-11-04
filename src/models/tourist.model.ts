//tourist.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITourist extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    nationality?: string;
    role: string;
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    // OTP-based verification fields
    emailOtpCode?: string;
    emailOtpExpires?: Date;
    // Onboarding and membership flags
    authProvider?: 'password' | 'google';
    isPaid?: boolean;
    isCommunityMember?: boolean;
    isOnboarded?: boolean;
    isContestant?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const touristSchema = new Schema<ITourist>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true
        },
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        phoneNumber: {
            type: String,
            trim: true
        },
        nationality: {
            type: String,
            trim: true
        },
        role: {
            type: String,
            default: 'tourist',
            enum: ['tourist']
        },
        isEmailVerified: {
            type: Boolean,
            default: false
        },
        emailVerificationToken: {
            type: String,
            select: false // Don't include in queries by default
        },
        emailVerificationExpires: {
            type: Date,
            select: false
        },
        passwordResetToken: {
            type: String,
            select: false
        },
        passwordResetExpires: {
            type: Date,
            select: false
        },
        emailOtpCode: {
            type: String,
            select: false
        },
        emailOtpExpires: {
            type: Date,
            select: false
        },
        authProvider: {
            type: String,
            enum: ['password', 'google'],
            default: 'password'
        },
        isPaid: {
            type: Boolean,
            default: false
        },
        isCommunityMember: {
            type: Boolean,
            default: false
        },
        isOnboarded: {
            type: Boolean,
            default: false
        },
        isContestant: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Only add indexes for fields that don't already have unique: true
// Email already has unique: true, so no need for explicit index
touristSchema.index({ emailVerificationToken: 1 });
touristSchema.index({ passwordResetToken: 1 });
touristSchema.index({ emailOtpCode: 1, emailOtpExpires: 1 });

export const Tourist = mongoose.model<ITourist>('Tourist', touristSchema);