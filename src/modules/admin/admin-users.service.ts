import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tourist, TouristDocument } from '../auth/schemas/tourist.schema';
import { BlockUserDto } from './dto/block-user.dto';

export interface UserSummaryStats {
  total: number;
  active: number;
  paid: number;
  verified: number;
  blocked: number;
  pendingRegistration: number;
  inProgressRegistration: number;
  completeRegistration: number;
}

export interface ListUsersOptions {
  page?: number;
  limit?: number;
  isPaid?: boolean;
  isEmailVerified?: boolean;
  isBlocked?: boolean;
  registrationStatus?: 'pending' | 'in_progress' | 'complete';
  search?: string;
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
  ) {}

  /**
   * List users with pagination, filters, search, and aggregate user summary stats.
   */
  async listUsers(options: ListUsersOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (options.isPaid !== undefined) {
      filter.isPaid = options.isPaid;
    }

    if (options.isEmailVerified !== undefined) {
      filter.isEmailVerified = options.isEmailVerified;
    }

    if (options.isBlocked !== undefined) {
      filter.isBlocked = options.isBlocked;
    }

    if (options.registrationStatus) {
      filter.registrationStatus = options.registrationStatus;
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { phoneNumber: searchRegex },
      ];
    }

    const [total, users, userSummary] = await Promise.all([
      this.touristModel.countDocuments(filter),
      this.touristModel
        .find(filter)
        .select('-password -passwordResetToken -passwordResetExpires -emailOtpCode -emailOtpExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.getUserSummaryStats(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      userSummary,
      data: users,
    };
  }

  /**
   * Get aggregate user overview metrics.
   */
  async getUserStats(): Promise<UserSummaryStats> {
    return this.getUserSummaryStats();
  }

  /**
   * Get full details of a specific user by ID.
   */
  async getUserDetail(id: string): Promise<TouristDocument> {
    const user = await this.touristModel
      .findById(id)
      .select('-password -passwordResetToken -passwordResetExpires -emailOtpCode -emailOtpExpires')
      .populate('contestantProfile')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user as unknown as TouristDocument;
  }

  /**
   * Block or unblock a user account.
   */
  async toggleBlockUser(id: string, dto: BlockUserDto, adminId: string): Promise<TouristDocument> {
    const user = await this.touristModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isBlocked === dto.isBlocked) {
      throw new BadRequestException(
        `User blocked status is already set to ${dto.isBlocked ? 'blocked' : 'unblocked'}`,
      );
    }

    user.isBlocked = dto.isBlocked;

    if (dto.isBlocked) {
      user.blockedAt = new Date();
      user.blockedReason = dto.reason || 'Blocked by admin';
    } else {
      user.blockedAt = undefined;
      user.blockedReason = undefined;
    }

    await user.save();

    this.logger.log(
      `User "${user.email}" (${id}) ${dto.isBlocked ? 'BLOCKED' : 'UNBLOCKED'} by admin ${adminId}` +
        (dto.reason ? ` — Reason: ${dto.reason}` : ''),
    );

    return user;
  }

  /**
   * Private helper: Aggregates total, active, paid, verified, blocked, and registration status counts.
   */
  private async getUserSummaryStats(): Promise<UserSummaryStats> {
    const stats = await this.touristModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          blocked: { $sum: { $cond: [{ $eq: ['$isBlocked', true] }, 1, 0] } },
          active: { $sum: { $cond: [{ $ne: ['$isBlocked', true] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] } },
          verified: { $sum: { $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0] } },
          pendingRegistration: { $sum: { $cond: [{ $eq: ['$registrationStatus', 'pending'] }, 1, 0] } },
          inProgressRegistration: { $sum: { $cond: [{ $eq: ['$registrationStatus', 'in_progress'] }, 1, 0] } },
          completeRegistration: { $sum: { $cond: [{ $eq: ['$registrationStatus', 'complete'] }, 1, 0] } },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        active: 0,
        paid: 0,
        verified: 0,
        blocked: 0,
        pendingRegistration: 0,
        inProgressRegistration: 0,
        completeRegistration: 0,
      };
    }

    const s = stats[0];
    return {
      total: s.total || 0,
      active: s.active || 0,
      paid: s.paid || 0,
      verified: s.verified || 0,
      blocked: s.blocked || 0,
      pendingRegistration: s.pendingRegistration || 0,
      inProgressRegistration: s.inProgressRegistration || 0,
      completeRegistration: s.completeRegistration || 0,
    };
  }
}
