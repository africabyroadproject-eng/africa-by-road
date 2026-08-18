import { Injectable, Logger } from '@nestjs/common';

export interface AdminAuditEntry {
  adminId: string;
  action: string;
  module: string;
  targetType: string;
  targetId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  logApiCall(service: string, action: string): void {
    this.logger.log(`SERVICE:${service} ACTION:${action}`);
  }

  /**
   * Log an admin-initiated state-changing action.
   *
   * Currently writes structured JSON to stdout. Module N will replace this
   * with database persistence in an `audit_logs` collection.
   */
  logAdminAction(entry: AdminAuditEntry): void {
    this.logger.log(
      `ADMIN_ACTION admin:${entry.adminId} action:${entry.action} ` +
        `module:${entry.module} target:${entry.targetType}/${entry.targetId} ` +
        `prev:${entry.previousValue ? JSON.stringify(entry.previousValue) : 'null'} ` +
        `new:${entry.newValue ? JSON.stringify(entry.newValue) : 'null'}`,
    );
  }
}

