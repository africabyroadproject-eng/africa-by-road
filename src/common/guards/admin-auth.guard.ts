import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AdminTokenPayload } from '../interfaces/token-payload.interface';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.adminToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Access denied. No token provided.');
    }

    try {
      const decoded = this.jwtService.verify<AdminTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('auth.jwtSecret'),
        algorithms: ['HS256'],
      });
      if (!['admin', 'superadmin'].includes(decoded.role)) {
        throw new Error('Invalid admin role');
      }
      req.admin = decoded;
      return true;
    } catch {
      throw new ForbiddenException('Invalid or expired admin token');
    }
  }
}
