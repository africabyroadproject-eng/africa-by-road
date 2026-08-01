import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser, info: { message?: string } | Error | null): TUser {
    if (!user) {
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('Access denied. No token provided.');
      }
      throw new ForbiddenException('Invalid or expired token');
    }
    return user;
  }

  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
