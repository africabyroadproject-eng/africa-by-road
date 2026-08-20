import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Selection: SendGrid', () => {
    beforeEach(async () => {
      const configServiceMock = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            EMAIL_PROVIDER: 'sendgrid',
            SENDGRID_API_KEY: 'test-sg-key',
            EMAIL_FROM: 'test@africabyroad.com',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configServiceMock },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('identifies provider as sendgrid', () => {
      expect(service.getProvider()).toBe('sendgrid');
      expect(service.isConfigured()).toBe(true);
      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-sg-key');
    });

    it('sends OTP email via SendGrid', async () => {
      const success = await service.sendOtpEmail('user@example.com', 'Alice', '123456');
      expect(success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: 'test@africabyroad.com',
          subject: 'Your Verification Code - Africa by Road',
        }),
      );
    });
  });

  describe('Provider Selection: SMTP', () => {
    let sendMailMock: jest.Mock;

    beforeEach(async () => {
      sendMailMock = jest.fn().mockResolvedValue({ messageId: 'smtp-123' });
      (nodemailer.createTransport as jest.Mock).mockReturnValue({
        sendMail: sendMailMock,
      });

      const configServiceMock = {
        get: jest.fn((key: string) => {
          const config: Record<string, string> = {
            EMAIL_PROVIDER: 'smtp',
            SMTP_HOST: 'smtp.mailtrap.io',
            SMTP_PORT: '2525',
            SMTP_USER: 'smtp_user',
            SMTP_PASS: 'smtp_pass',
            EMAIL_FROM: 'smtp@africabyroad.com',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configServiceMock },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
    });

    it('identifies provider as smtp', () => {
      expect(service.getProvider()).toBe('smtp');
      expect(service.isConfigured()).toBe(true);
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.mailtrap.io',
        port: 2525,
        secure: false,
        auth: { user: 'smtp_user', pass: 'smtp_pass' },
      });
    });

    it('sends welcome email via SMTP', async () => {
      const success = await service.sendWelcomeEmail('john@example.com', 'John', 'Doe');
      expect(success).toBe(true);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          from: 'smtp@africabyroad.com',
          subject: 'Welcome to Africa by Road!',
        }),
      );
    });

    it('sends test email to default address (owellrichard@gmail.com) via SMTP', async () => {
      const res = await service.sendTestEmail();
      expect(res.success).toBe(true);
      expect(res.provider).toBe('smtp');
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'owellrichard@gmail.com',
          from: 'smtp@africabyroad.com',
          subject: 'Africa by Road - Test Email',
        }),
      );
    });
  });

  describe('Unconfigured Provider Graceful Fallback', () => {
    it('skips email sending gracefully if SMTP host is missing in SMTP mode', async () => {
      const configServiceMock = {
        get: jest.fn((key: string) => (key === 'EMAIL_PROVIDER' ? 'smtp' : undefined)),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: configServiceMock },
        ],
      }).compile();

      service = module.get<EmailService>(EmailService);
      expect(service.getProvider()).toBe('smtp');
      expect(service.isConfigured()).toBe(false);

      const result = await service.sendOtpEmail('test@example.com', 'Bob', '654321');
      expect(result).toBe(true);
      expect(sgMail.send).not.toHaveBeenCalled();
    });
  });
});
