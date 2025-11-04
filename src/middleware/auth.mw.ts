/// <reference path="../types/express/index.d.ts" />

// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/auth.config';
import { TokenPayload } from '../interfaces/auth.interface';

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    } 

    try {
        const decoded = jwt.verify(token, jwtConfig.secret) as TokenPayload;
        req.user = decoded; // Attach user info to req
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
}