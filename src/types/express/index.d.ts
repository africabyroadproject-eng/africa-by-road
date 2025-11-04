// types/express/index.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
        iat?: number;
        exp?: number;
      };
    }
  }
}

export {};
