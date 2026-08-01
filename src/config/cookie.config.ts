import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

export function getCookieConfig(configService: ConfigService): CookieOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: configService.get<boolean>('auth.cookieSecure'),
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: configService.get<number>('auth.cookieMaxAge'),
    path: '/',
  };
}
