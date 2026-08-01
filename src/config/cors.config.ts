import { ConfigService } from '@nestjs/config';

export function getAllowedOrigins(configService: ConfigService): string[] {
  const configured = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

  return configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
