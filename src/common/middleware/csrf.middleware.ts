import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { getAllowedOrigins } from '../../config/cors.config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly allowedOrigins: Set<string>;

  constructor(configService: ConfigService) {
    this.allowedOrigins = new Set(getAllowedOrigins(configService));
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const usesCookieAuth = Boolean(req.cookies?.token);
    if (SAFE_METHODS.has(req.method) || !usesCookieAuth) {
      next();
      return;
    }

    if (this.allowedOrigins.has('*')) {
      next();
      return;
    }

    const origin = req.headers.origin?.replace(/\/$/, '');
    const isAllowedNetlify = Boolean(origin?.endsWith(".netlify.app"));
    if (!origin || (!this.allowedOrigins.has(origin) && !isAllowedNetlify)) {
      res.status(403).json({ message: 'Request origin is not allowed' });
      return;
    }

    next();
  }
}
