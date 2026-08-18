import { SetMetadata } from '@nestjs/common';

export type AdminRole =
  | 'superadmin'
  | 'admin'
  | 'user_manager'
  | 'contestant_manager'
  | 'voting_manager'
  | 'trivia_manager'
  | 'prize_manager';

export const ROLES_KEY = 'roles';

/**
 * Decorator that specifies which admin roles are allowed to access a route.
 * `superadmin` always has implicit access via the RolesGuard.
 *
 * @example
 * ```ts
 * @Roles('voting_manager')
 * @UseGuards(AdminAuthGuard, RolesGuard)
 * ```
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
