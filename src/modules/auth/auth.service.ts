import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { compare, genSalt, hash } from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from './services/email.service';
import { Tourist, TouristDocument } from './schemas/tourist.schema';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isEmailVerified: boolean;
  };
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function secretsMatch(storedHash: string, candidate: string): boolean {
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(hashSecret(candidate), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  generateToken(tourist: TouristDocument): string {
    return this.jwtService.sign(
      {
        id: tourist._id,
        email: tourist.email,
        role: tourist.role,
        isEmailVerified: tourist.isEmailVerified,
      },
      {
        secret: this.configService.getOrThrow<string>('auth.jwtSecret'),
        expiresIn: this.configService.get<string>('auth.jwtExpiresIn') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        algorithm: 'HS256',
        issuer: this.configService.getOrThrow<string>('auth.jwtIssuer'),
        audience: this.configService.getOrThrow<string>('auth.jwtAudience'),
      },
    );
  }

  private toAuthUser(tourist: TouristDocument) {
    return {
      id: tourist._id.toString(),
      email: tourist.email,
      firstName: tourist.firstName,
      lastName: tourist.lastName,
      role: tourist.role,
      isEmailVerified: tourist.isEmailVerified,
    };
  }

  private validatePasswordStrength(password: string): void {
    const sanitized = password.trim();

    if (sanitized.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (sanitized.length > 128) {
      throw new BadRequestException('Password must be less than 128 characters long');
    }
    if (!/[A-Z]/.test(sanitized)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(sanitized)) {
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(sanitized)) {
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(sanitized)) {
      throw new BadRequestException('Password must contain at least one special character');
    }

    const commonPatterns = [/(.)\1{2,}/, /123456|654321|abcdef|qwerty|password/i];
    for (const pattern of commonPatterns) {
      if (pattern.test(sanitized)) {
        throw new BadRequestException('Password contains common patterns and is not secure enough');
      }
    }
  }

  async register(dto: RegisterDto): Promise<{ message: string } & AuthResult> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.touristModel.findOne({ email });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    this.validatePasswordStrength(dto.password);

    const salt = await genSalt(10);
    const hashedPassword = await hash(dto.password.trim(), salt);
    const otpCode = this.emailService.generateOtpCode();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const tourist = new this.touristModel({
      ...dto,
      email,
      password: hashedPassword,
      role: 'tourist',
      isEmailVerified: false,
      emailOtpCode: hashSecret(otpCode),
      emailOtpExpires: otpExpires,
      authProvider: 'password',
    });
    await tourist.save();

    const emailSent = await this.emailService.sendOtpEmail(tourist.email, tourist.firstName, otpCode);
    if (!emailSent) {
      this.logger.warn('Failed to send registration OTP');
    }

    return {
      message: 'Registered successfully. Enter the verification code sent to your email.',
      token: this.generateToken(tourist),
      user: this.toAuthUser(tourist),
    };
  }

  async login(dto: LoginDto): Promise<{ message: string } & AuthResult> {
    const tourist = await this.touristModel.findOne({ email: dto.email.trim().toLowerCase() }).select('+password');
    if (!tourist) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await compare(dto.password.trim(), tourist.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      message: 'Login successful',
      token: this.generateToken(tourist),
      user: this.toAuthUser(tourist),
    };
  }

  async verifyEmailOtp(email: string, otpCode: string): Promise<{ message: string } & AuthResult> {
    const tourist = await this.touristModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+emailOtpCode +emailOtpExpires +emailOtpAttempts');
    if (!tourist) {
      throw new NotFoundException('Account not found');
    }
    if (tourist.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }
    if (!tourist.emailOtpCode || !tourist.emailOtpExpires) {
      throw new BadRequestException('No active verification code');
    }
    if (new Date() > tourist.emailOtpExpires) {
      throw new BadRequestException('Verification code expired');
    }
    if (!secretsMatch(tourist.emailOtpCode, otpCode)) {
      tourist.emailOtpAttempts = (tourist.emailOtpAttempts || 0) + 1;
      if (tourist.emailOtpAttempts >= 5) {
        tourist.emailOtpCode = undefined;
        tourist.emailOtpExpires = undefined;
      }
      await tourist.save();
      throw new BadRequestException('Invalid verification code');
    }

    tourist.isEmailVerified = true;
    tourist.emailOtpCode = undefined;
    tourist.emailOtpExpires = undefined;
    tourist.emailOtpAttempts = 0;
    await tourist.save();

    await this.emailService.sendWelcomeEmail(tourist.email, tourist.firstName, tourist.lastName);

    return {
      message: 'Email verified successfully.',
      token: this.generateToken(tourist),
      user: this.toAuthUser(tourist),
    };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const tourist = await this.touristModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+emailOtpCode +emailOtpExpires +emailOtpAttempts');
    if (!tourist) {
      throw new NotFoundException('No account found with this email address');
    }
    if (tourist.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otpCode = this.emailService.generateOtpCode();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    const emailSent = await this.emailService.sendOtpEmail(tourist.email, tourist.firstName, otpCode);
    if (!emailSent) {
      throw new BadRequestException('Failed to send verification code');
    }

    tourist.emailOtpCode = hashSecret(otpCode);
    tourist.emailOtpExpires = otpExpires;
    tourist.emailOtpAttempts = 0;
    await tourist.save();

    return { message: 'Verification code sent successfully. Please check your inbox.' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage = 'If an account with this email exists, a password reset link has been sent.';
    const tourist = await this.touristModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+passwordResetExpires');

    if (!tourist || (tourist.passwordResetExpires && tourist.passwordResetExpires > new Date())) {
      return { message: genericMessage };
    }

    const passwordResetToken = this.emailService.generateVerificationToken();
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

    tourist.passwordResetToken = hashSecret(passwordResetToken);
    tourist.passwordResetExpires = passwordResetExpires;
    await tourist.save();

    const emailSent = await this.emailService.sendPasswordResetEmail(tourist.email, tourist.firstName, passwordResetToken);
    if (!emailSent) {
      this.logger.warn('Failed to send password reset email');
    }

    return { message: genericMessage };
  }

  async validateResetToken(token: string): Promise<{ message: string }> {
    const tourist = await this.touristModel.findOne({
      passwordResetToken: hashSecret(token),
      passwordResetExpires: { $gt: new Date() },
    });
    if (!tourist) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
    return { message: 'Token is valid' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    this.validatePasswordStrength(newPassword);

    const tourist = await this.touristModel.findOne({
      passwordResetToken: hashSecret(token),
      passwordResetExpires: { $gt: new Date() },
    });
    if (!tourist) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const salt = await genSalt(10);
    tourist.password = await hash(newPassword, salt);
    tourist.passwordResetToken = undefined;
    tourist.passwordResetExpires = undefined;
    await tourist.save();

    return { message: 'Password reset successfully' };
  }

  async changePassword(dto: ChangePasswordDto & { touristId: string }): Promise<{ message: string }> {
    const tourist = await this.touristModel.findById(dto.touristId).select('+password');
    if (!tourist) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await compare(dto.currentPassword, tourist.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    this.validatePasswordStrength(dto.newPassword);

    const salt = await genSalt(10);
    tourist.password = await hash(dto.newPassword, salt);
    await tourist.save();

    return { message: 'Password changed successfully' };
  }

  async findOrCreateFromGoogle(payload: { email: string; email_verified?: boolean; given_name?: string; family_name?: string }): Promise<AuthResult> {
    if (!payload.email_verified) {
      throw new BadRequestException('Google email not verified');
    }

    let tourist = await this.touristModel.findOne({ email: payload.email });

    if (tourist) {
      tourist.isEmailVerified = true;
      tourist.authProvider = 'google';
      if (!tourist.firstName && payload.given_name) tourist.firstName = payload.given_name;
      if (!tourist.lastName && payload.family_name) tourist.lastName = payload.family_name;
      tourist.emailOtpCode = undefined;
      tourist.emailOtpExpires = undefined;
      tourist.emailOtpAttempts = 0;
      await tourist.save();
    } else {
      const salt = await genSalt(10);
      const randomPassword = `G-${randomBytes(16).toString('hex')}!`;
      const hashedPassword = await hash(randomPassword, salt);

      tourist = await this.touristModel.create({
        email: payload.email,
        password: hashedPassword,
        firstName: payload.given_name || 'Google',
        lastName: payload.family_name || 'User',
        role: 'tourist',
        isEmailVerified: true,
        authProvider: 'google',
      });
    }

    return {
      token: this.generateToken(tourist),
      user: this.toAuthUser(tourist),
    };
  }
}
