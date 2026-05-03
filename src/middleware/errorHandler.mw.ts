import { Request, Response, NextFunction } from 'express';
import fs from 'fs';

const ERROR_LOG_FILE = process.env.ERROR_LOG_FILE || 'error.log';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
    const timestamp = new Date().toISOString();
    const errorEntry = `${timestamp} ${req.method} ${req.originalUrl} ERROR:${err.message} STACK:${err.stack}\n`;

    console.error(errorEntry);

    fs.appendFile(ERROR_LOG_FILE, errorEntry, (writeErr) => {
        if (writeErr) console.error('Error log write failed:', writeErr);
    });

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    res.status(statusCode).json({
        message: process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

export function notFoundHandler(req: Request, res: Response): void {
    res.status(404).json({
        message: `Route ${req.originalUrl} not found`
    });
}