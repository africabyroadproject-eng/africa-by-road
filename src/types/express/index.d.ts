// types/express/index.d.ts
import { AdminTokenPayload, TokenPayload } from '../../common/interfaces/token-payload.interface';

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends TokenPayload {}

    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

export {};
