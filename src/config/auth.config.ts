//auth.config.ts
import { Secret } from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
}

export const jwtConfig = {
    secret: jwtSecret as Secret,
    expiresIn: '24h',
    refreshExpiresIn: '7d',
    issuer: 'africa-by-road',
    audience: 'tourist-users'
};

export const cookieConfig = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
};