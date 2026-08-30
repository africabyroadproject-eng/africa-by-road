import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminService } from './admin.service';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { AuditLog, AuditLogSchema } from '../../common/schemas/audit-log.schema';
import { AuditService } from '../../common/services/audit.service';
import { Tourist, TouristSchema } from '../auth/schemas/tourist.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>('auth.jwtExpiresIn') as `${number}${'s' | 'm' | 'h' | 'd'}`,
          issuer: configService.getOrThrow<string>('auth.jwtIssuer'),
          audience: configService.getOrThrow<string>('auth.jwtAudience'),
          algorithm: 'HS256',
        },
      }),
    }),
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Tourist.name, schema: TouristSchema },
    ]),
  ],
  controllers: [AdminAuthController, AdminAuditController, AdminUsersController],
  providers: [AdminService, AdminUsersService, AuditService],
  exports: [AdminService, AdminUsersService, AuditService],
})
export class AdminModule {}
