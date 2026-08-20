import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';
import { randomBytes, randomInt } from 'crypto';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type EmailProvider = 'sendgrid' | 'smtp';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;
  private readonly apiKey: string;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  // SMTP parameters
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpSecure: boolean;
  private readonly smtpUser: string;
  private readonly smtpPass: string;
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(configService: ConfigService) {
    this.fromEmail = configService.get<string>('EMAIL_FROM') || 'Africabyroadproject@gmail.com';
    this.frontendUrl = (configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').split(',')[0].replace(/\/$/, '');

    const requestedProvider = (configService.get<string>('EMAIL_PROVIDER') || '').toLowerCase().trim();
    this.apiKey = configService.get<string>('SENDGRID_API_KEY') || '';

    this.smtpHost = configService.get<string>('SMTP_HOST') || '';
    this.smtpPort = parseInt(configService.get<string>('SMTP_PORT') || '587', 10);
    const smtpSecureRaw = configService.get<string>('SMTP_SECURE');
    this.smtpSecure = smtpSecureRaw !== undefined ? smtpSecureRaw === 'true' : this.smtpPort === 465;
    this.smtpUser = configService.get<string>('SMTP_USER') || '';
    this.smtpPass = configService.get<string>('SMTP_PASS') || '';

    if (requestedProvider === 'smtp') {
      this.provider = 'smtp';
    } else if (requestedProvider === 'sendgrid') {
      this.provider = 'sendgrid';
    } else {
      // Default auto-detect: if SMTP host is configured use smtp, else sendgrid
      this.provider = this.smtpHost ? 'smtp' : 'sendgrid';
    }

    if (this.provider === 'sendgrid' && this.apiKey) {
      sgMail.setApiKey(this.apiKey);
    } else if (this.provider === 'smtp' && this.smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: this.smtpPort,
        secure: this.smtpSecure,
        auth: this.smtpUser
          ? {
              user: this.smtpUser,
              pass: this.smtpPass,
            }
          : undefined,
      });
    }
  }

  public getProvider(): EmailProvider {
    return this.provider;
  }

  public isConfigured(): boolean {
    if (this.provider === 'smtp') {
      return Boolean(this.smtpHost);
    }
    return Boolean(this.apiKey);
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  public generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  public generateOtpCode(): string {
    return String(randomInt(100000, 999999));
  }

  public async sendWelcomeEmail(email: string, firstName: string, lastName: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        this.logger.log(`Welcome email skipped because email provider (${this.provider}) is not configured`);
        return true;
      }

      await this.sendEmail({
        to: email,
        subject: 'Welcome to Africa by Road!',
        html: this.getWelcomeEmailTemplate(this.escapeHtml(firstName), this.escapeHtml(lastName)),
        text: `Welcome to Africa by Road, ${firstName}! Your email has been verified successfully.`,
      });
      return true;
    } catch (error) {
      this.logger.error('Error sending welcome email:', error as Error);
      return false;
    }
  }

  public async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        this.logger.log(`Password reset email skipped because email provider (${this.provider}) is not configured`);
        return true;
      }

      const resetUrl = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

      await this.sendEmail({
        to: email,
        subject: 'Reset Your Password - Africa by Road',
        html: this.getPasswordResetEmailTemplate(this.escapeHtml(firstName), resetUrl),
        text: `Hi ${firstName}, reset your password by clicking this link: ${resetUrl}`,
      });
      return true;
    } catch (error) {
      this.logger.error('Error sending password reset email:', error as Error);
      return false;
    }
  }

  public async sendOtpEmail(email: string, firstName: string, otpCode: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        this.logger.log(`OTP email skipped because email provider (${this.provider}) is not configured`);
        return true;
      }

      await this.sendEmail({
        to: email,
        subject: 'Your Verification Code - Africa by Road',
        html: this.getOtpEmailTemplate(this.escapeHtml(firstName), otpCode),
        text: `Hi ${firstName}, your verification code is: ${otpCode}. It expires in 10 minutes.`,
      });
      this.logger.log(`OTP email sent successfully via ${this.provider}`);
      return true;
    } catch (error) {
      this.logger.error('Error sending OTP email:', error as Error);
      return false;
    }
  }

  public async sendTestEmail(
    toEmail = 'owellrichard@gmail.com',
  ): Promise<{ success: boolean; provider: string; message: string }> {
    try {
      if (!this.isConfigured()) {
        const msg = `Email provider '${this.provider}' is not fully configured (missing ${
          this.provider === 'smtp' ? 'SMTP_HOST' : 'SENDGRID_API_KEY'
        }).`;
        this.logger.warn(`Test email failed: ${msg}`);
        return { success: false, provider: this.provider, message: msg };
      }

      const timestamp = new Date().toISOString();
      await this.sendEmail({
        to: toEmail,
        subject: 'Africa by Road - Test Email',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #667eea; margin-top: 0;">Africa by Road Email Delivery Test</h2>
            <p>Hello,</p>
            <p>This is a test email sent from <strong>Africa by Road Backend</strong> to verify your email setup.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Provider</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${this.provider.toUpperCase()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Recipient</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${toEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Sender</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${this.fromEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9; font-weight: bold;">Sent At</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${timestamp}</td>
              </tr>
            </table>
            <p style="color: #2e7d32; font-weight: bold;">🎉 If you received this email, your email configuration is working correctly!</p>
          </div>
        `,
        text: `Africa by Road Email Delivery Test\n\nProvider: ${this.provider.toUpperCase()}\nRecipient: ${toEmail}\nSender: ${this.fromEmail}\nSent At: ${timestamp}\n\nIf you received this email, your email configuration is working correctly!`,
      });

      const successMsg = `Test email sent successfully to ${toEmail} using ${this.provider.toUpperCase()}.`;
      this.logger.log(successMsg);
      return { success: true, provider: this.provider, message: successMsg };
    } catch (error) {
      const errorMsg = (error as Error).message || 'Unknown error';
      this.logger.error(`Error sending test email to ${toEmail}:`, error as Error);
      return {
        success: false,
        provider: this.provider,
        message: `Failed to send test email via ${this.provider.toUpperCase()}: ${errorMsg}`,
      };
    }
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    if (this.provider === 'smtp' && this.transporter) {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } else {
      await sgMail.send({
        to: options.to,
        from: this.fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    }
  }

  private getWelcomeEmailTemplate(firstName: string, lastName: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to Africa by Road</title></head>
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
                    <a href="${this.frontendUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Start Your Journey</a>
                </div>
                <p>Thank you for joining our community. Get ready for an amazing adventure!</p>
                <p style="font-size: 14px; color: #666;">Best regards,<br>The Africa by Road Team</p>
            </div>
        </body>
        </html>
        `;
  }

  private getPasswordResetEmailTemplate(firstName: string, resetUrl: string): string {
    return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Your Password</title></head>
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
                <p style="font-size: 14px; color: #666;">Best regards,<br>The Africa by Road Team</p>
            </div>
        </body>
        </html>
        `;
  }

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
                <p style="font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        </body>
        </html>
        `;
  }
}
