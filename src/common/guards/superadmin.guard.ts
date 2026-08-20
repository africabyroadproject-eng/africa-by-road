import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if ((req as any).admin?.role !== 'superadmin') {
      throw new ForbiddenException('Superadmin access required');
    }
    return true;
  }
}
