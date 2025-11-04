//auth.config.ts
import { Secret } from 'jsonwebtoken';

export const jwtConfig = {
    secret: process.env.JWT_SECRET as Secret || 'your-secret-key',
    expiresIn: '24h',
    refreshExpiresIn: '7d',
    issuer: 'africa-by-road',
    audience: 'tourist-users'
};

export const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
};