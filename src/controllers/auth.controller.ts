//auth.controller.ts
import { Request, Response } from 'express';
import { cookieConfig } from '../config/auth.config';
import {
    LoginCredentials,
    RegisterTouristDto,
    ResendVerificationDto,
    ForgotPasswordDto,
    ResetPasswordDto,
    ChangePasswordDto
} from '../interfaces/auth.interface';
import TouristService from '../services/tourist.service';
import { EmailOtpVerifyDto, GoogleVerifyDto } from '../interfaces/auth.interface';
import { googleAuthService } from '../services/google.service';
import { Tourist } from '../models/tourist.model';
import { genSalt, hash } from 'bcrypt';

export class AuthController {
    public async register(req: Request<{}, {}, RegisterTouristDto>, res: Response):Promise<void> {
        try {
            const result = await TouristService.register(req.body);

            if (result.error) {
                res.status(result.code || 400).json({
                    message: result.message
                });
                return
            }

            // Set cookie
            res.cookie('token', result.data.token, cookieConfig);

           res.status(201).json({
                message: result.message,
                token: result.data.token,
                user: result.data.user
            }); return
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            res.status(500).json({
                message: 'Registration failed',
                error: errorMessage
            }); return
        }
    }

    public async login(req: Request<{}, {}, LoginCredentials>, res: Response): Promise<void> {
        try {
            const result = await TouristService.login(req.body);

            if (result.error) {
                res.status(result.code || 400).json({
                    message: result.message
                }); return
            }

            // Set cookie
            res.cookie('token', result.data.token, cookieConfig);

             res.status(200).json({
                message: result.message,
                token: result.data.token,
                user: result.data.user
            }); return
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
             res.status(500).json({
                message: 'Login failed',
                error: errorMessage
            }); return
        }
    }

    public async logout(req: Request, res: Response): Promise<void> {
        try {
            res.clearCookie('token');
             res.status(200).json({ message: 'Logged out successfully' });
             return
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Logout failed';
             res.status(500).json({
                message: 'Logout failed',
                error: errorMessage
            }); return
        }
    }

    // Removed legacy token verification method:
    // public async verifyEmail(req: Request<{}, {}, {}, EmailVerificationDto>, res: Response): Promise<void> { ... }

    public async resendVerification(req: Request<{}, {}, ResendVerificationDto>, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json({
                    message: 'Email is required'
                });
                return;
            }

            const result = await TouristService.resendVerification(email);

            if (result.error) {
                res.status(result.code || 400).json({
                    message: result.message
                });
                return;
            }

            res.status(200).json({
                message: result.message
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification email';
            res.status(500).json({
                message: 'Failed to resend verification email',
                error: errorMessage
            });
            return;
        }
    }

    public async forgotPassword(req: Request<{}, {}, ForgotPasswordDto>, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json({
                    message: 'Email is required'
                });
                return;
            }

            const result = await TouristService.forgotPassword(email);

            if (result.error) {
                res.status(result.code || 400).json({
                    message: result.message
                });
                return;
            }

            res.status(200).json({
                message: result.message
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send password reset email';
            res.status(500).json({
                message: 'Failed to send password reset email',
                error: errorMessage
            });
            return;
        }
    }

    public async resetPassword(req: Request<{}, {}, ResetPasswordDto>, res: Response): Promise<void> {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                res.status(400).json({
                    message: 'Token and new password are required'
                });
                return;
            }

            const result = await TouristService.resetPassword(token, newPassword);

            if (result.error) {
                res.status(result.code || 400).json({
                    message: result.message
                });
                return;
            }

            res.status(200).json({
                message: result.message
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
            res.status(500).json({
                message: 'Password reset failed',
                error: errorMessage
            });
            return;
        }
    }

    public async validateResetToken(req: Request<{}, {}, {}, { token?: string }>, res: Response): Promise<void> {
        try {
            const { token } = req.query;

            if (!token) {
                res.status(400).json({
                    message: 'Token is required'
                });
                return;
            }

            const result = await TouristService.validateResetToken(token);

            if (result.error) {
                res.status(result.code || 400).json({
                    message: result.message
                });
                return;
            }

            res.status(200).json({
                message: 'Token is valid'
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to validate token';
            res.status(500).json({
                message: 'Failed to validate token',
                error: errorMessage
            });
            return;
        }
    }

    /**
     * Verify email using OTP
     */
    public async verifyEmailOtp(req: Request<{}, {}, EmailOtpVerifyDto>, res: Response): Promise<void> {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                res.status(400).json({ message: 'Email and OTP are required' });
                return;
            }

            const result = await TouristService.verifyEmailOtp(email, otp);
            if (result.error) {
                res.status(result.code || 400).json({ message: result.message });
                return;
            }

            res.status(200).json({ message: result.message, user: result.data });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
            res.status(500).json({ message: 'Email verification failed', error: errorMessage });
            return;
        }
    }

    /**
     * Verify Google Sign-In id_token and mark email verified
     */
    public async changePassword(req: Request<{}, {}, ChangePasswordDto>, res: Response): Promise<void> {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: 'Authentication required' }); return
            }

            const result = await TouristService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);

            if (result.error) {
                res.status(result.code || 400).json({ message: result.message }); return
            }

            res.status(200).json({ message: result.message }); return
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to change password';
            res.status(500).json({ message: 'Failed to change password', error: errorMessage }); return
        }
    }

    public async googleVerify(req: Request<{}, {}, GoogleVerifyDto>, res: Response): Promise<void> {
        try {
            const { idToken } = req.body;
            if (!idToken) {
                res.status(400).json({ message: 'idToken is required' });
                return;
            }

            const payload = await googleAuthService.verifyIdToken(idToken);

            if (!payload || !payload.email) {
                res.status(400).json({ message: 'Unable to verify Google token' });
                return;
            }

            const { email, email_verified, given_name, family_name } = payload;
            if (!email_verified) {
                res.status(400).json({ message: 'Google email not verified' });
                return;
            }

            const existing = await Tourist.findOne({ email });
            let tourist: any;

            if (existing) {
                existing.isEmailVerified = true;
                existing.authProvider = 'google';
                if (!existing.firstName && given_name) existing.firstName = given_name;
                if (!existing.lastName && family_name) existing.lastName = family_name;
                existing.emailOtpCode = undefined;
                existing.emailOtpExpires = undefined;
                await existing.save();
                tourist = existing;
            } else {
                const salt = await genSalt(10);
                const randomPass = cryptoRandomPassword();
                const hashedPassword = await hash(randomPass, salt);

                tourist = await Tourist.create({
                    email,
                    password: hashedPassword,
                    firstName: given_name || 'Google',
                    lastName: family_name || 'User',
                    role: 'tourist',
                    isEmailVerified: true,
                    authProvider: 'google'
                });
            }

            const token = TouristService.generateToken(tourist);

            res.status(200).json({
                message: 'Google verification successful',
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
            });
            return;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Google verification failed';
            res.status(500).json({ message: 'Google verification failed', error: errorMessage });
            return;
        }
    }
}

function cryptoRandomPassword(): string {
    const buf = require('crypto').randomBytes(16).toString('hex');
    return `G-${buf}!`;
}