//email.service.ts
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private apiKey: string;
    private fromEmail: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY || '';
        this.fromEmail = process.env.EMAIL_FROM || 'Africabyroadproject@gmail.com';
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        
        if (this.apiKey) {
            sgMail.setApiKey(this.apiKey);
        }
    }

    /**
     * Generate a secure token (used for password reset)
     */
    public generateVerificationToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    // Removed: VerificationEmailData interface and sendVerificationEmail + getVerificationEmailTemplate
    // We use OTP for email verification.

    public async sendWelcomeEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
        try {
            if (!this.apiKey) {
                console.log('Welcome email would be sent to:', email);
                return true;
            }

            const emailOptions: EmailOptions = {
                to: email,
                subject: 'Welcome to Africa by Road!',
                html: this.getWelcomeEmailTemplate(firstName, lastName),
                text: `Welcome to Africa by Road, ${firstName}! Your email has been verified successfully.`
            };

            await this.sendEmail(emailOptions);
            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return false;
        }
    }

    /**
     * Send password reset email
     */
    public async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean> {
        try {
            if (!this.apiKey) {
                console.log('Password reset email would be sent to:', email);
                return true;
            }

            const resetUrl = `${this.baseUrl}/api/auth/reset-password?token=${resetToken}`;
            
            const emailOptions: EmailOptions = {
                to: email,
                subject: 'Reset Your Password - Africa by Road',
                html: this.getPasswordResetEmailTemplate(firstName, resetUrl),
                text: `Hi ${firstName}, reset your password by clicking this link: ${resetUrl}`
            };

            await this.sendEmail(emailOptions);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return false;
        }
    }

    /**
     * Core email sending method
     */
    private async sendEmail(options: EmailOptions): Promise<void> {
        const msg = {
            to: options.to,
            from: this.fromEmail,
            subject: options.subject,
            text: options.text,
            html: options.html,
        };

        await sgMail.send(msg);
    }

    /**
     * Email verification template
     */
    private getVerificationEmailTemplate(firstName: string, lastName: string, verificationUrl: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Africa by Road</h1>
                <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Adventure Awaits!</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Hi ${firstName} ${lastName}!</h2>
                
                <p>Welcome to Africa by Road! We're excited to have you join our community of adventure seekers.</p>
                
                <p>To complete your registration and start your journey with us, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                </div>
                
                <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
                
                <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="font-size: 14px; color: #666;">
                    If you didn't create an account with Africa by Road, please ignore this email.
                </p>
                
                <p style="font-size: 14px; color: #666;">
                    Best regards,<br>
                    The Africa by Road Team
                </p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Welcome email template
     */
    private getWelcomeEmailTemplate(firstName: string, lastName: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Africa by Road</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to Africa by Road!</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Congratulations ${firstName} ${lastName}!</h2>
                
                <p>Your email has been successfully verified and your account is now active!</p>
                
                <p>You can now:</p>
                <ul>
                    <li>🗳️ Participate in voting (with subscription)</li>
                    <li>💬 Join our community discussions</li>
                    <li>🎁 Enter giveaways and contests</li>
                    <li>📺 Follow the Africa by Road show</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${this.baseUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Start Your Journey</a>
                </div>
                
                <p>Thank you for joining our community. Get ready for an amazing adventure!</p>
                
                <p style="font-size: 14px; color: #666;">
                    Best regards,<br>
                    The Africa by Road Team
                </p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Password reset email template
     */
    private getPasswordResetEmailTemplate(firstName: string, resetUrl: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Africa by Road</h1>
                <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Password Reset</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Hi ${firstName}!</h2>
                
                <p>We received a request to reset your password for your Africa by Road account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
                
                <p><strong>Important:</strong> This reset link will expire in 1 hour for security reasons.</p>
                
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                
                <p style="font-size: 14px; color: #666;">
                    Best regards,<br>
                    The Africa by Road Team
                </p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate a 6-digit OTP code
     */
    public generateOtpCode(): string {
        const code = Math.floor(100000 + Math.random() * 900000);
        return String(code);
    }

    /**
     * Send OTP email for verification
     */
    public async sendOtpEmail(email: string, firstName: string, otpCode: string): Promise<boolean> {
        try {
            if (!this.apiKey) {
                console.log('OTP email would be sent to:', email, 'code:', otpCode);
                return true;
            }

            const emailOptions: EmailOptions = {
                to: email,
                subject: 'Your Verification Code - Africa by Road',
                html: this.getOtpEmailTemplate(firstName, otpCode),
                text: `Hi ${firstName}, your verification code is: ${otpCode}. It expires in 10 minutes.`
            };

            await this.sendEmail(emailOptions);
            console.log('OTP email sent successfully to:', email, 'code:', otpCode);
            return true;
        } catch (error) {
            console.error('Error sending OTP email:', error);
            return false;
        }
    }

    /**
     * OTP email template
     */
    private getOtpEmailTemplate(firstName: string, otpCode: string): string {
        return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your Verification Code</title></head>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Africa by Road</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="margin-top: 0;">Hi ${firstName}!</h2>
                <p>Use the verification code below to confirm your email address:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333;">${otpCode}</div>
                    <p style="color: #666;">This code expires in 10 minutes.</p>
                </div>
                <p style="font-size: 14px; color: #666;">If you didn’t request this, you can safely ignore this email.</p>
            </div>
        </body>
        </html>
        `;
    }
}

export const emailService = new EmailService();