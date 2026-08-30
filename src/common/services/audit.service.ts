import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

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

export interface AuditLogQueryFilters {
  module?: string;
  adminId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(
    @Optional() @InjectModel(AuditLog.name) private readonly auditLogModel?: Model<AuditLogDocument>,
  ) {}

  logApiCall(service: string, action: string): void {
    this.logger.log(`SERVICE:${service} ACTION:${action}`);
  }

  /**
   * Log an admin-initiated state-changing action.
   *
   * Writes to both the database (for queryable audit trail) and stdout
   * (for dev convenience and log aggregation services).
   */
  async logAdminAction(entry: AdminAuditEntry): Promise<void> {
    // Always log to stdout for backward compatibility
    this.logger.log(
      `ADMIN_ACTION admin:${entry.adminId} action:${entry.action} ` +
        `module:${entry.module} target:${entry.targetType}/${entry.targetId} ` +
        `prev:${entry.previousValue ? JSON.stringify(entry.previousValue) : 'null'} ` +
        `new:${entry.newValue ? JSON.stringify(entry.newValue) : 'null'}`,
    );

    // Persist to database if the model is available
    if (this.auditLogModel) {
      try {
        await this.auditLogModel.create({
          adminId: new Types.ObjectId(entry.adminId),
          action: entry.action,
          module: entry.module,
          targetType: entry.targetType,
          targetId: entry.targetId,
          previousValue: entry.previousValue,
          newValue: entry.newValue,
          ipAddress: entry.ipAddress,
        });
      } catch (err) {
        // Never let audit log persistence failures break the main operation
        this.logger.error(`Failed to persist audit log: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Query audit logs with filters and pagination.
   */
  async queryLogs(filters: AuditLogQueryFilters) {
    if (!this.auditLogModel) {
      return { total: 0, page: filters.page, limit: filters.limit, totalPages: 0, data: [] };
    }

    const { page, limit, module, adminId, action, targetType, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (module) query.module = module;
    if (adminId) query.adminId = new Types.ObjectId(adminId);
    if (action) query.action = { $regex: action, $options: 'i' };
    if (targetType) query.targetType = targetType;

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      query.createdAt = dateFilter;
    }

    const [total, logs] = await Promise.all([
      this.auditLogModel.countDocuments(query),
      this.auditLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data: logs,
    };
  }

  /**
   * Get a single audit log entry by ID.
   */
  async getLogById(id: string) {
    if (!this.auditLogModel) return null;

    const log = await this.auditLogModel.findById(id).lean();
    return log;
  }
}
