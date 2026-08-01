import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly client: OAuth2Client;
  private readonly clientId?: string;

  constructor(configService: ConfigService) {
    this.clientId = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!this.clientId) {
      this.logger.warn('GOOGLE_CLIENT_ID not set. Google verification will fail unless configured.');
    }
    if (!clientSecret) {
      this.logger.warn('GOOGLE_CLIENT_SECRET not set. Google verification may fail for some operations.');
    }

    this.client = new OAuth2Client({ clientId: this.clientId, clientSecret });
  }

  public async verifyIdToken(idToken: string): Promise<TokenPayload | null> {
    try {
      if (!this.clientId) {
        this.logger.error('GOOGLE_CLIENT_ID not configured');
        return null;
      }

      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      return ticket.getPayload() || null;
    } catch (error) {
      this.logger.error('Failed to verify Google id_token:', error as Error);
      return null;
    }
  }
}
