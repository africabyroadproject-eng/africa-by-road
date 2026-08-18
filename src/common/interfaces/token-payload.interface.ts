export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  iat?: number;
  exp?: number;
}

export type AdminRoleType =
  | 'admin'
  | 'superadmin'
  | 'user_manager'
  | 'contestant_manager'
  | 'voting_manager'
  | 'trivia_manager'
  | 'prize_manager';

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: AdminRoleType;
  iat?: number;
  exp?: number;
}
