import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { EmailService } from './services/email.service';

function createMockTouristModel() {
  const model: any = jest.fn().mockImplementation((doc: Record<string, unknown>) => ({
    _id: new Types.ObjectId(),
    ...doc,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  model.findOne = jest.fn();
  model.findById = jest.fn();
  model.create = jest.fn();
  return model;
}

describe('AuthService', () => {
  let authService: AuthService;
  let touristModel: ReturnType<typeof createMockTouristModel>;

  beforeEach(async () => {
    touristModel = createMockTouristModel();

    const configServiceMock = {
      get: jest.fn((key: string) => ({ 'auth.jwtSecret': 'test-secret', 'auth.jwtExpiresIn': '24h' }[key])),
      getOrThrow: jest.fn(() => 'test-secret'),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        EmailService,
        { provide: getModelToken('Tourist'), useValue: touristModel },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('rejects a weak password before touching the database', async () => {
      touristModel.findOne.mockResolvedValue(null);

      await expect(
        authService.register({ email: 'a@b.com', password: 'weak', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects registration when the email is already taken', async () => {
      touristModel.findOne.mockResolvedValue({ _id: 'existing' });

      await expect(
        authService.register({ email: 'a@b.com', password: 'Str0ng!Pass', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a tourist and returns a token on success', async () => {
      touristModel.findOne.mockResolvedValue(null);

      const result = await authService.register({
        email: 'new@example.com',
        password: 'Str0ng!Pass',
        firstName: 'New',
        lastName: 'User',
      });

      expect(touristModel).toHaveBeenCalledTimes(1);
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.isEmailVerified).toBe(false);
    });
  });

  describe('login', () => {
    it('rejects when no account matches the email', async () => {
      touristModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

      await expect(authService.login({ email: 'missing@example.com', password: 'whatever' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects when the password does not match', async () => {
      const hashedPassword = await hash('CorrectPass1!', 10);
      touristModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: '1', email: 'a@b.com', password: hashedPassword }),
      });

      await expect(authService.login({ email: 'a@b.com', password: 'WrongPass1!' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns a token when credentials are valid', async () => {
      const hashedPassword = await hash('CorrectPass1!', 10);
      touristModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: '1',
          email: 'a@b.com',
          password: hashedPassword,
          firstName: 'A',
          lastName: 'B',
          role: 'tourist',
          isEmailVerified: true,
        }),
      });

      const result = await authService.login({ email: 'a@b.com', password: 'CorrectPass1!' });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('a@b.com');
    });
  });
});
