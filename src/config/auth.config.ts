import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshExpiresIn: '7d',
  jwtIssuer: 'africa-by-road',
  jwtAudience: 'tourist-users',
  cookieSecure: process.env.NODE_ENV === 'production',
  cookieMaxAge: 24 * 60 * 60 * 1000,
}));
