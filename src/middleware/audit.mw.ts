import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const LOG_FILE = process.env.AUDIT_LOG_FILE || 'audit.log';

function formatLog(entry: string): string {
    return `[${new Date().toISOString()}] ${entry}\n`;
}

export function auditLog(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const entry = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms user:${req.user?.id || 'anonymous'}`;
        const log = formatLog(entry);

        fs.appendFile(LOG_FILE, log, (err) => {
            if (err) console.error('Audit log write failed:', err);
        });
    });

    next();
}

export function logApiCall(service: string, action: string) {
    const entry = formatLog(`SERVICE:${service} ACTION:${action}`);
    fs.appendFile(LOG_FILE, entry, (err) => {
        if (err) console.error('Audit log write failed:', err);
    });
}