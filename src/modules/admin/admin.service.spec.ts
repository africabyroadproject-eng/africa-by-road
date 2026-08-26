import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';
import { Admin } from './schemas/admin.schema';

describe('AdminService', () => {
  let service: AdminService;
  let adminModel: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    adminModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'ADMIN_EMAIL') return 'admin@africabyroad.com';
        if (key === 'ADMIN_PASSWORD') return 'SuperAdminPass123!';
        if (key === 'auth.jwtExpiresIn') return '7d';
        return null;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'auth.jwtSecret') return 'test-secret';
        if (key === 'auth.jwtIssuer') return 'test-issuer';
        if (key === 'auth.jwtAudience') return 'test-audience';
        return 'test-val';
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(Admin.name), useValue: adminModel },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  describe('seedSuperadmin', () => {
    it('seeds superadmin account if email and password env vars are present and account does not exist', async () => {
      adminModel.findOne.mockResolvedValue(null);
      adminModel.create.mockResolvedValue({
        _id: 'superadmin_id',
        email: 'admin@africabyroad.com',
        role: 'superadmin',
        isActive: true,
      });

      const result = await service.seedSuperadmin();
      expect(result.seeded).toBe(true);
      expect(adminModel.create).toHaveBeenCalled();
    });

    it('skips seeding if superadmin account already exists', async () => {
      adminModel.findOne.mockResolvedValue({ email: 'admin@africabyroad.com' });

      const result = await service.seedSuperadmin();
      expect(result.seeded).toBe(false);
      expect(adminModel.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException if email does not match any admin record (e.g. tourist trying admin login)', async () => {
      adminModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.login({ email: 'tourist@example.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException if admin account is disabled', async () => {
      adminModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          email: 'disabled@admin.com',
          isActive: false,
        }),
      });

      await expect(
        service.login({ email: 'disabled@admin.com', password: 'Password123!' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('logs in active admin with correct credentials and returns token + admin data', async () => {
      const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
      const mockAdmin = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@africabyroad.com',
        password: hashedPassword,
        role: 'superadmin',
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
        save: jest.fn().mockResolvedValue(true),
      };

      adminModel.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockAdmin),
      });

      const result = await service.login({
        email: 'admin@africabyroad.com',
        password: 'AdminPass123!',
      });

      expect(result.token).toBe('mocked-jwt-token');
      expect(result.admin).toEqual({
        id: '507f1f77bcf86cd799439011',
        email: 'admin@africabyroad.com',
        role: 'superadmin',
        firstName: 'Super',
        lastName: 'Admin',
      });
    });
  });
});
