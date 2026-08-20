import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { getCookieConfig } from '../../config/cookie.config';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailOtpVerifyDto } from './dto/email-otp-verify.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleVerifyDto } from './dto/google-verify.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';

@ApiTags('Auth')
@Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new tourist' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    res.cookie('token', result.token, getCookieConfig(this.configService));
    return { message: result.message, token: result.token, user: result.user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login tourist' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    res.cookie('token', result.token, getCookieConfig(this.configService));
    return { message: result.message, token: result.token, user: result.user };
  }

  @Post('verify-email/confirm-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP code' })
  async verifyEmailOtp(@Body() dto: EmailOtpVerifyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyEmailOtp(dto.email, dto.otp);
    res.cookie('token', result.token, getCookieConfig(this.configService));
    return { message: result.message, token: result.token, user: result.user };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('google/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Google ID token for social login' })
  async googleVerify(@Body() dto: GoogleVerifyDto, @Res({ passthrough: true }) res: Response) {
    const payload = await this.googleAuthService.verifyIdToken(dto.idToken);
    if (!payload || !payload.email) {
      throw new BadRequestException('Unable to verify Google token');
    }

    const result = await this.authService.findOrCreateFromGoogle({
      email: payload.email,
      email_verified: payload.email_verified,
      given_name: payload.given_name,
      family_name: payload.family_name,
    });
    res.cookie('token', result.token, getCookieConfig(this.configService));
    return { message: 'Google verification successful', data: result };
  }

  @Get('reset-password')
  @ApiOperation({ summary: 'Validate password reset token' })
  validateResetToken(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.authService.validateResetToken(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout (clear auth cookie)' })
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _maxAge, ...cookieOptions } = getCookieConfig(this.configService);
    res.clearCookie('token', cookieOptions);
    return { message: 'Logged out successfully' };
  }

  @Get('session')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 100, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Check the current authenticated session' })
  session(@CurrentUser() user: TokenPayload) {
    return { user };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password (authenticated)' })
  changePassword(@CurrentUser() user: TokenPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword({ ...dto, touristId: user.id });
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test email to test SMTP or SendGrid provider configuration' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'owellrichard@gmail.com', description: 'Target email address' },
      },
    },
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Test email execution result' })
  sendTestEmailPost(@Body('email') toEmail?: string) {
    return this.emailService.sendTestEmail(toEmail || 'owellrichard@gmail.com');
  }

  @Get('test-email')
  @ApiOperation({ summary: 'Send test email via GET request to test SMTP or SendGrid provider configuration' })
  @ApiQuery({ name: 'email', required: false, type: String, description: 'Target email address (defaults to owellrichard@gmail.com)' })
  @ApiResponse({ status: 200, description: 'Test email execution result' })
  sendTestEmailGet(@Query('email') toEmail?: string) {
    return this.emailService.sendTestEmail(toEmail || 'owellrichard@gmail.com');
  }
}
