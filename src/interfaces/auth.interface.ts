//auth.interface.ts
export interface LoginCredentials {
    email: string;
    password: string;
}

export interface TokenPayload {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    iat?: number;
    exp?: number;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
    };
}

export interface RegisterTouristDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    nationality?: string;
}

export interface EmailVerificationDto {
    token: string;
}

export interface ResendVerificationDto {
    email: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}

// OTP verification DTOs
export interface EmailOtpRequestDto {
    email: string;
}

export interface EmailOtpVerifyDto {
    email: string;
    otp: string;
}

// Google verification DTO
export interface GoogleVerifyDto {
    idToken: string;
}

// Profile DTOs
export interface PersonalInfoDto {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dateOfBirth?: string;
    nationality?: string;
    state?: string;
    city?: string;
    residentialAddress?: string;
    phoneNumber?: string;
}

export interface SocialMediaDto {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
}

export interface DocumentDto {
    type: 'governmentId' | 'proofOfAddress' | 'medicalRecords';
    name: string;
    url: string;
}