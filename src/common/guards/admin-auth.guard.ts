import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AdminRoleType, AdminTokenPayload } from '../interfaces/token-payload.interface';

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
      const validRoles: AdminRoleType[] = [
        'admin', 'superadmin', 'user_manager', 'contestant_manager',
        'voting_manager', 'trivia_manager', 'prize_manager',
      ];
      if (!validRoles.includes(decoded.role)) {
        throw new Error('Invalid admin role');
      }
      (req as any).admin = decoded;
      return true;
    } catch {
      throw new ForbiddenException('Invalid or expired admin token');
    }
  }
}
