import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  logApiCall(service: string, action: string): void {
    this.logger.log(`SERVICE:${service} ACTION:${action}`);
  }
}
