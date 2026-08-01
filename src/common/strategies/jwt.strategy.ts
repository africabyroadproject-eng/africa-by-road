import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../interfaces/token-payload.interface';

function fromCookieOrAuthHeader(req: Request): string | null {
  return req.cookies?.token || ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: fromCookieOrAuthHeader,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
      issuer: configService.getOrThrow<string>('auth.jwtIssuer'),
      audience: configService.getOrThrow<string>('auth.jwtAudience'),
      algorithms: ['HS256'],
    });
  }

  validate(payload: TokenPayload): TokenPayload {
    if (payload.role !== 'tourist') {
      throw new UnauthorizedException('Invalid token role');
    }
    return payload;
  }
}
