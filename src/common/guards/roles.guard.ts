import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AdminRole, ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that enforces role-based access control for admin endpoints.
 *
 * Usage: Place **after** `AdminAuthGuard` in the `@UseGuards()` chain so that
 * `req.admin` is already populated.
 *
 * - `superadmin` always passes regardless of declared roles.
 * - `admin` passes for any admin-only route (no specific role required).
 * - Module-specific roles (e.g. `voting_manager`) only pass when explicitly listed.
 *
 * If no `@Roles()` decorator is present, the guard allows access (i.e. any
 * authenticated admin can proceed).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → any authenticated admin is allowed
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const adminRole = req.admin?.role;

    if (!adminRole) {
      throw new ForbiddenException('Admin authentication required');
    }

    // Superadmin has implicit access to everything
    if (adminRole === 'superadmin') {
      return true;
    }

    // 'admin' role has access to all admin endpoints (general admin)
    if (adminRole === 'admin') {
      return true;
    }

    // Check if the admin's specific role is in the required roles list
    if (requiredRoles.includes(adminRole as AdminRole)) {
      return true;
    }

    throw new ForbiddenException(
      `Access denied. Required role(s): ${requiredRoles.join(', ')}. Your role: ${adminRole}`,
    );
  }
}
