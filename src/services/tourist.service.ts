//tourist.service.ts
import { Request } from 'express';
import { Tourist, ITourist } from '../models/tourist.model';
import { jwtConfig } from '../config/auth.config';
import { LoginCredentials, RegisterTouristDto, AuthResponse } from '../interfaces/auth.interface';
import { sign } from 'jsonwebtoken';
import { hash, genSalt, compare } from 'bcrypt';
import { emailService } from './email.service';

interface IResult {
    error: boolean;
    message: string;
    data: any;
    code?: number;
}

class TouristService {
    public result: IResult;

    constructor() {
        this.result = { error: false, message: '', data: null };
    }

    /**
     * Validate tourist registration data
     */
    public async validateRegister(data: RegisterTouristDto): Promise<IResult> {
        let result: IResult = { error: false, message: '', data: null };

        if (!data.email) {
            result.error = true;
            result.message = 'Email is required';
        } else if (!data.password) {
            result.error = true;
            result.message = 'Password is required';
        } else if (!data.firstName) {
            result.error = true;
            result.message = 'First name is required';
        } else if (!data.lastName) {
            result.error = true;
            result.message = 'Last name is required';
        } else {
            // Check if email is already registered
            const existingTourist = await Tourist.findOne({ email: data.email });
            if (existingTourist) {
                result.error = true;
                result.message = 'Email is already registered';
            }
        }

        return result;
    }

    /**
     * Validate tourist login credentials
     */
    public async validateLogin(data: LoginCredentials): Promise<IResult> {
        let result: IResult = { error: false, message: '', code: 200, data: null };

        if (!data.email) {
            result.error = true;
            result.message = 'Email is required';
        } else if (!data.password) {
            result.error = true;
            result.message = 'Password is required';
        } else {
            // Check if tourist exists
            const tourist = await Tourist.findOne({ email: data.email });
            if (!tourist) {
                result.error = true;
                result.message = 'Invalid credentials';
                result.code = 401;
            }
        }

        return result;
    }

    /**
     * Register a new tourist
     */
    public async register(data: RegisterTouristDto): Promise<IResult> {
        // Validate registration data
        const validationResult = await this.validateRegister(data);
        if (validationResult.error) {
            return validationResult;
        }

        // Validate password strength
        const passwordValidation = this.validatePassword(data.password);
        if (!passwordValidation.isValid) {
            return {
                error: true,
                message: passwordValidation.message,
                code: 400,
                data: null
            };
        }

        try {
            // Hash password
            const salt = await genSalt(10);
            const hashedPassword = await hash(data.password.trim(), salt);

            // Generate OTP instead of token
            const otpCode = emailService.generateOtpCode();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Create new tourist
            const tourist = new Tourist({
                ...data,
                password: hashedPassword,
                role: 'tourist',
                isEmailVerified: false,
                emailOtpCode: otpCode,
                emailOtpExpires: otpExpires,
                authProvider: 'password'
            });

            await tourist.save();

            // Send OTP email
            const emailSent = await emailService.sendOtpEmail(tourist.email, tourist.firstName, otpCode);
            if (!emailSent) {
                console.warn('Failed to send OTP to:', tourist.email);
            }

            // Generate JWT token
            const token = this.generateToken(tourist);

            return {
                error: false,
                message: 'Registered successfully. Enter the verification code sent to your email.',
                data: {
                    token,
                    user: {
                        id: tourist._id,
                        email: tourist.email,
                        firstName: tourist.firstName,
                        lastName: tourist.lastName,
                        role: tourist.role,
                        isEmailVerified: tourist.isEmailVerified
                    }
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            return {
                error: true,
                message: 'Registration failed',
                data: errorMessage
            };
        }
    }

    /**
     * Login tourist
     */
    public async login(data: LoginCredentials): Promise<IResult> {
        // Validate login credentials
        const validationResult = await this.validateLogin(data);
        if (validationResult.error) {
            return validationResult;
        }

        try {
            const tourist = await Tourist.findOne({ email: data.email });
            
            // Verify password
            if (!tourist) {
                return {
                    error: true,
                    message: 'Invalid credentials',
                    code: 401,
                    data: null
                };
            }

            const isValidPassword = await compare(data.password, tourist.password);
            if (!isValidPassword) {
                return {
                    error: true,
                    message: 'Invalid credentials',
                    code: 401,
                    data: null
                };
            }

            // Generate JWT token
            const token = this.generateToken(tourist);

            return {
                error: false,
                message: 'Login successful',
                data: {
                    token,
                    user: {
                        id: tourist._id,
                        email: tourist.email,
                        firstName: tourist.firstName,
                        lastName: tourist.lastName,
                        role: tourist.role,
                        isEmailVerified: tourist.isEmailVerified
                    }
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            return {
                error: true,
                message: 'Login failed',
                data: errorMessage
            };
        }
    }

    /**
     * Verify email with OTP
     */
    public async verifyEmailOtp(email: string, otpCode: string): Promise<IResult> {
        try {
            const tourist = await Tourist.findOne({ email }).select('+emailOtpCode +emailOtpExpires');
            if (!tourist) {
                return { error: true, message: 'Account not found', code: 404, data: null };
            }
            if (tourist.isEmailVerified) {
                return { error: true, message: 'Email already verified', code: 400, data: null };
            }
            if (!tourist.emailOtpCode || !tourist.emailOtpExpires) {
                return { error: true, message: 'No active verification code', code: 400, data: null };
            }
            if (new Date() > tourist.emailOtpExpires) {
                return { error: true, message: 'Verification code expired', code: 400, data: null };
            }
            if (tourist.emailOtpCode !== otpCode) {
                return { error: true, message: 'Invalid verification code', code: 400, data: null };
            }

            tourist.isEmailVerified = true;
            tourist.emailOtpCode = undefined;
            tourist.emailOtpExpires = undefined;
            await tourist.save();

            await emailService.sendWelcomeEmail(tourist.email, tourist.firstName, tourist.lastName);

            return {
                error: false,
                message: 'Email verified successfully! Proceed to payment.',
                data: {
                    id: tourist._id,
                    email: tourist.email,
                    firstName: tourist.firstName,
                    lastName: tourist.lastName,
                    role: tourist.role,
                    isEmailVerified: tourist.isEmailVerified
                }
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
            return {
                error: true,
                message: 'Email verification failed',
                data: errorMessage
            };
        }
    }

    /**
     * Resend verification via OTP
     */
    public async resendVerification(email: string): Promise<IResult> {
        try {
            const tourist = await Tourist.findOne({ email }).select('+emailOtpCode +emailOtpExpires');

            if (!tourist) {
                return {
                    error: true,
                    message: 'No account found with this email address',
                    code: 404,
                    data: null
                };
            }

            if (tourist.isEmailVerified) {
                return {
                    error: true,
                    message: 'Email is already verified',
                    code: 400,
                    data: null
                };
            }

            // Generate new OTP
            tourist.emailOtpCode = emailService.generateOtpCode();
            tourist.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await tourist.save();

            const emailSent = await emailService.sendOtpEmail(tourist.email, tourist.firstName, tourist.emailOtpCode!);

            if (!emailSent) {
                return {
                    error: true,
                    message: 'Failed to send verification code',
                    code: 500,
                    data: null
                };
            }

            return {
                error: false,
                message: 'Verification code sent successfully. Please check your inbox.',
                data: null
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification code';
            return {
                error: true,
                message: 'Failed to resend verification code',
                data: errorMessage
            };
        }
    }

    /**
     * Forgot password - send reset email
     */
    public async forgotPassword(email: string): Promise<IResult> {
        try {
            const tourist = await Tourist.findOne({ email });

            if (!tourist) {
                // Don't reveal if email exists or not for security
                return {
                    error: false,
                    message: 'If an account with this email exists, a password reset link has been sent.',
                    data: null
                };
            }

            // Generate password reset token
            const passwordResetToken = emailService.generateVerificationToken();
            const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            tourist.passwordResetToken = passwordResetToken;
            tourist.passwordResetExpires = passwordResetExpires;
            await tourist.save();

            // Send password reset email
            const emailSent = await emailService.sendPasswordResetEmail(
                tourist.email,
                tourist.firstName,
                passwordResetToken
            );

            if (!emailSent) {
                console.warn('Failed to send password reset email to:', tourist.email);
            }

            return {
                error: false,
                message: 'If an account with this email exists, a password reset link has been sent.',
                data: null
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to process password reset request';
            return {
                error: true,
                message: 'Failed to process password reset request',
                data: errorMessage
            };
        }
    }

    /**
     * Reset password with token
     */
    public async validateResetToken(token: string): Promise<IResult> {
        try {
            const tourist = await Tourist.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: new Date() }
            });

            if (!tourist) {
                return {
                    error: true,
                    message: 'Invalid or expired password reset token',
                    code: 400,
                    data: null
                };
            }

            return {
                error: false,
                message: 'Token is valid',
                data: null
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to validate token';
            return {
                error: true,
                message: 'Failed to validate token',
                data: errorMessage
            };
        }
    }

    /**
     * Reset password using token
     */
    public async resetPassword(token: string, newPassword: string): Promise<IResult> {
        try {
            // Validate password strength
            const passwordValidation = this.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                return {
                    error: true,
                    message: passwordValidation.message,
                    code: 400,
                    data: null
                };
            }

            // Find tourist with valid reset token
            const tourist = await Tourist.findOne({
                passwordResetToken: token,
                passwordResetExpires: { $gt: new Date() }
            });

            if (!tourist) {
                return {
                    error: true,
                    message: 'Invalid or expired password reset token',
                    code: 400,
                    data: null
                };
            }

            // Hash new password
            const salt = await genSalt(10);
            const hashedPassword = await hash(newPassword, salt);

            // Update password and clear reset token
            tourist.password = hashedPassword;
            tourist.passwordResetToken = undefined;
            tourist.passwordResetExpires = undefined;
            
            await tourist.save();

            return {
                error: false,
                message: 'Password reset successfully',
                data: null
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
            return {
                error: true,
                message: 'Failed to reset password',
                data: errorMessage
            };
        }
    }

    /**
     * Validate password strength and sanitization
     */
    private validatePassword(password: string): { isValid: boolean; message: string } {
        // Sanitize password - trim whitespace
        const sanitizedPassword = password.trim();
        
        // Check minimum length
        if (sanitizedPassword.length < 8) {
            return {
                isValid: false,
                message: 'Password must be at least 8 characters long'
            };
        }

        // Check maximum length (prevent DoS attacks)
        if (sanitizedPassword.length > 128) {
            return {
                isValid: false,
                message: 'Password must be less than 128 characters long'
            };
        }

        // Check for at least one uppercase letter
        if (!/[A-Z]/.test(sanitizedPassword)) {
            return {
                isValid: false,
                message: 'Password must contain at least one uppercase letter'
            };
        }

        // Check for at least one lowercase letter
        if (!/[a-z]/.test(sanitizedPassword)) {
            return {
                isValid: false,
                message: 'Password must contain at least one lowercase letter'
            };
        }

        // Check for at least one number
        if (!/\d/.test(sanitizedPassword)) {
            return {
                isValid: false,
                message: 'Password must contain at least one number'
            };
        }

        // Check for at least one special character
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sanitizedPassword)) {
            return {
                isValid: false,
                message: 'Password must contain at least one special character'
            };
        }

        // Check for common patterns to avoid
        const commonPatterns = [
            /(.)\1{2,}/, // Three or more consecutive identical characters
            /123456|654321|abcdef|qwerty|password/i, // Common sequences
        ];

        for (const pattern of commonPatterns) {
            if (pattern.test(sanitizedPassword)) {
                return {
                    isValid: false,
                    message: 'Password contains common patterns and is not secure enough'
                };
            }
        }

        return {
            isValid: true,
            message: 'Password is valid'
        };
    }

    /**
     * Generate JWT token
     */
    private generateToken(tourist: ITourist): string {
        return sign(
            { 
                id: tourist._id,
                email: tourist.email,
                role: tourist.role,
                isEmailVerified: tourist.isEmailVerified
            },
            jwtConfig.secret,
            {
                expiresIn: process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN) : '24h',
                algorithm: 'HS256'
            }
        );
    }
}

export default new TouristService();