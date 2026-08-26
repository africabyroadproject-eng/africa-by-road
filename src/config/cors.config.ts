import { ConfigService } from '@nestjs/config';

export function getAllowedOrigins(configService: ConfigService): string[] {
  const configured = configService.get<string>('FRONTEND_URL') || '*';

  if (configured === '*') {
    return ['*'];
  }

  return configured
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}
