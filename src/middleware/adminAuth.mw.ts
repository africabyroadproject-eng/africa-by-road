import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth.config';

export interface AdminPayload {
    id: string;
    email: string;
    role: 'admin' | 'superadmin';
}

export function verifyAdminToken(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies?.adminToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtConfig.secret) as AdminPayload;
        req.admin = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired admin token' });
    }
}

export function requireSuperadmin(req: Request, res: Response, next: NextFunction): void {
    if (req.admin?.role !== 'superadmin') {
        res.status(403).json({ message: 'Superadmin access required' });
        return;
    }
    next();
}

declare global {
    namespace Express {
        interface Request {
            admin?: AdminPayload;
        }
    }
}