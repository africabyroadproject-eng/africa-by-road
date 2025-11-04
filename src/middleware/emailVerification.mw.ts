import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user's email is verified
 * This should be used for endpoints that require email verification
 */
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Check if user is authenticated (should be used after verifyToken middleware)
        if (!req.user) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Check if email is verified
        if (!req.user.isEmailVerified) {
            res.status(403).json({
                message: 'Email verification required. Please verify your email address to access this feature.',
                code: 'EMAIL_NOT_VERIFIED'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            message: 'Error checking email verification status'
        });
        return;
    }
};

/**
 * Middleware to check if user's email is NOT verified
 * Useful for endpoints that should only be accessible to unverified users
 */
export const requireEmailNotVerified = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({
                message: 'Authentication required'
            });
            return;
        }

        // Check if email is already verified
        if (req.user.isEmailVerified) {
            res.status(400).json({
                message: 'Email is already verified'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            message: 'Error checking email verification status'
        });
        return;
    }
};