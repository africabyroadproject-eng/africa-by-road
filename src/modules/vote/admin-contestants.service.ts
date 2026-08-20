import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contestant, ContestantDocument, StageHistoryEntry } from './schemas/contestant.schema';
import { CreateContestantDto } from './dto/create-contestant.dto';
import { UpdateContestantDto } from './dto/update-contestant.dto';
import { MoveContestantStageDto, StageType } from './dto/move-contestant-stage.dto';
import { ContestantStatusType, UpdateContestantStatusDto } from './dto/update-contestant-status.dto';

export interface ContestantStageSummary {
  total: number;
  active: number;
  pending: number;
  eliminated: number;
  winner: number;
  stage1: number;
  stage2: number;
  stage3: number;
  stage4: number;
  final: number;
}

export interface ListContestantsOptions {
  page?: number;
  limit?: number;
  stage?: StageType;
  status?: ContestantStatusType;
  country?: string;
  search?: string;
}

@Injectable()
export class AdminContestantsService {
  private readonly logger = new Logger(AdminContestantsService.name);

  constructor(
    @InjectModel(Contestant.name) private readonly contestantModel: Model<ContestantDocument>,
  ) {}

  /**
   * List all contestants with pagination, filters, search, and aggregate stage summary stats.
   */
  async listContestants(options: ListContestantsOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (options.stage) {
      filter.currentStage = options.stage;
    }

    if (options.status) {
      filter.status = options.status;
    }

    if (options.country) {
      filter.country = { $regex: new RegExp(options.country, 'i') };
    }

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      filter.$or = [{ name: searchRegex }, { country: searchRegex }, { bio: searchRegex }];
    }

    const [total, contestants, stageSummary] = await Promise.all([
      this.contestantModel.countDocuments(filter),
      this.contestantModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.getStageSummaryStats(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stageSummary,
      data: contestants,
    };
  }

  /**
   * Get full details of a specific contestant by ID.
   */
  async getContestantDetail(id: string): Promise<ContestantDocument> {
    const contestant = await this.contestantModel.findById(id).lean();
    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }
    return contestant as unknown as ContestantDocument;
  }

  /**
   * Create a new contestant directly from the admin panel.
   */
  async createContestant(dto: CreateContestantDto, adminId: string): Promise<ContestantDocument> {
    const initialStage = dto.currentStage || 'Stage 1';
    const initialStatus = dto.status || 'active';

    const initialHistoryEntry: StageHistoryEntry = {
      fromStage: 'N/A',
      toStage: initialStage,
      movedBy: new Types.ObjectId(adminId),
      reason: 'Initial contestant registration by admin',
      movedAt: new Date(),
    };

    const contestant = await this.contestantModel.create({
      name: dto.name,
      country: dto.country,
      bio: dto.bio,
      imageUrl: dto.imageUrl,
      currentStage: initialStage,
      status: initialStatus,
      createdBy: new Types.ObjectId(adminId),
      stageHistory: [initialHistoryEntry],
    });

    this.logger.log(`Contestant "${dto.name}" (${String(contestant._id)}) created by admin ${adminId}`);
    return contestant;
  }

  /**
   * Update basic contestant information (name, country, bio, image).
   */
  async updateContestant(id: string, dto: UpdateContestantDto, adminId: string): Promise<ContestantDocument> {
    const contestant = await this.contestantModel.findById(id);
    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    if (dto.name !== undefined) contestant.name = dto.name;
    if (dto.country !== undefined) contestant.country = dto.country;
    if (dto.bio !== undefined) contestant.bio = dto.bio;
    if (dto.imageUrl !== undefined) contestant.imageUrl = dto.imageUrl;

    await contestant.save();
    this.logger.log(`Contestant "${contestant.name}" (${id}) updated by admin ${adminId}`);
    return contestant;
  }

  /**
   * Transition a contestant to a new competition stage and log the stage history.
   */
  async moveContestantStage(id: string, dto: MoveContestantStageDto, adminId: string): Promise<ContestantDocument> {
    const contestant = await this.contestantModel.findById(id);
    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    if (contestant.currentStage === dto.stage) {
      throw new BadRequestException(`Contestant is already at "${dto.stage}"`);
    }

    const previousStage = contestant.currentStage;
    contestant.currentStage = dto.stage;

    const historyEntry: StageHistoryEntry = {
      fromStage: previousStage,
      toStage: dto.stage,
      movedBy: new Types.ObjectId(adminId),
      reason: dto.reason,
      movedAt: new Date(),
    };

    contestant.stageHistory.push(historyEntry);

    await contestant.save();
    this.logger.log(
      `Contestant "${contestant.name}" (${id}) stage moved from "${previousStage}" to "${dto.stage}" by admin ${adminId}` +
        (dto.reason ? ` — Reason: ${dto.reason}` : ''),
    );

    return contestant;
  }

  /**
   * Update contestant status (pending, active, eliminated, winner).
   */
  async updateContestantStatus(id: string, dto: UpdateContestantStatusDto, adminId: string): Promise<ContestantDocument> {
    const contestant = await this.contestantModel.findById(id);
    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    if (contestant.status === dto.status) {
      throw new BadRequestException(`Contestant status is already "${dto.status}"`);
    }

    const previousStatus = contestant.status;
    contestant.status = dto.status;

    if (dto.status === 'eliminated' && !contestant.eliminatedAt) {
      contestant.eliminatedAt = new Date();
    }

    await contestant.save();
    this.logger.log(
      `Contestant "${contestant.name}" (${id}) status changed from "${previousStatus}" to "${dto.status}" by admin ${adminId}` +
        (dto.reason ? ` — Reason: ${dto.reason}` : ''),
    );

    return contestant;
  }

  /**
   * Get the complete stage movement audit history trail for a contestant.
   */
  async getContestantStageHistory(id: string): Promise<StageHistoryEntry[]> {
    const contestant = await this.contestantModel.findById(id).lean();
    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    return (contestant.stageHistory || []).sort(
      (a, b) => new Date(b.movedAt).getTime() - new Date(a.movedAt).getTime(),
    );
  }

  /**
   * Private helper: Aggregates summary counts across status and stages.
   */
  private async getStageSummaryStats(): Promise<ContestantStageSummary> {
    const stats = await this.contestantModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          eliminated: { $sum: { $cond: [{ $eq: ['$status', 'eliminated'] }, 1, 0] } },
          winner: { $sum: { $cond: [{ $eq: ['$status', 'winner'] }, 1, 0] } },
          stage1: { $sum: { $cond: [{ $eq: ['$currentStage', 'Stage 1'] }, 1, 0] } },
          stage2: { $sum: { $cond: [{ $eq: ['$currentStage', 'Stage 2'] }, 1, 0] } },
          stage3: { $sum: { $cond: [{ $eq: ['$currentStage', 'Stage 3'] }, 1, 0] } },
          stage4: { $sum: { $cond: [{ $eq: ['$currentStage', 'Stage 4'] }, 1, 0] } },
          final: { $sum: { $cond: [{ $eq: ['$currentStage', 'Final'] }, 1, 0] } },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        active: 0,
        pending: 0,
        eliminated: 0,
        winner: 0,
        stage1: 0,
        stage2: 0,
        stage3: 0,
        stage4: 0,
        final: 0,
      };
    }

    const s = stats[0];
    return {
      total: s.total || 0,
      active: s.active || 0,
      pending: s.pending || 0,
      eliminated: s.eliminated || 0,
      winner: s.winner || 0,
      stage1: s.stage1 || 0,
      stage2: s.stage2 || 0,
      stage3: s.stage3 || 0,
      stage4: s.stage4 || 0,
      final: s.final || 0,
    };
  }
}
