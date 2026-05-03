//tourist.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument {
    name: string;
    url: string;
    uploadedAt?: Date;
}

export interface ISocialMedia {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
}

import { Types } from 'mongoose';

export interface ITourist extends Document {
    email: string;
    password: string;
    firstName: string;
    middleName?: string;
    lastName?: string;
    phoneNumber?: string;
    nationality?: string;
    state?: string;
    city?: string;
    residentialAddress?: string;
    dateOfBirth?: Date;
    role: 'tourist';
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    emailOtpCode?: string;
    emailOtpExpires?: Date;
    authProvider?: 'password' | 'google';
    isPaid?: boolean;
    paymentReference?: string;
    paymentDate?: Date;
    isCommunityMember?: boolean;
    isOnboarded?: boolean;
    contestantProfile?: Types.ObjectId;
    socialMedia?: ISocialMedia;
    governmentId?: IDocument;
    proofOfAddress?: IDocument;
    medicalRecords?: IDocument;
    registrationStatus: 'pending' | 'in_progress' | 'complete';
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
        middleName: {
            type: String,
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
        state: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            trim: true
        },
        residentialAddress: {
            type: String,
            trim: true
        },
        dateOfBirth: {
            type: Date
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
            select: false
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
        paymentReference: {
            type: String
        },
        paymentDate: {
            type: Date
        },
        isCommunityMember: {
            type: Boolean,
            default: false
        },
        isOnboarded: {
            type: Boolean,
            default: false
        },
        contestantProfile: {
            type: Schema.Types.ObjectId,
            ref: 'Contestant'
        },
        socialMedia: {
            instagram: String,
            facebook: String,
            twitter: String,
            tiktok: String,
            youtube: String
        },
        governmentId: {
            name: String,
            url: String,
            uploadedAt: Date
        },
        proofOfAddress: {
            name: String,
            url: String,
            uploadedAt: Date
        },
        medicalRecords: {
            name: String,
            url: String,
            uploadedAt: Date
        },
        registrationStatus: {
            type: String,
            enum: ['pending', 'in_progress', 'complete'],
            default: 'pending'
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