export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  iat?: number;
  exp?: number;
}

export interface AdminTokenPayload {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  iat?: number;
  exp?: number;
}
