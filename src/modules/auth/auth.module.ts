import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './services/email.service';
import { GoogleAuthService } from './services/google-auth.service';
import { Tourist, TouristSchema } from './schemas/tourist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tourist.name, schema: TouristSchema }]),
    PassportModule,
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
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, GoogleAuthService, JwtStrategy],
  exports: [MongooseModule, AuthService],
})
export class AuthModule {}
