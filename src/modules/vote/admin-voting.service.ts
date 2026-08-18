import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contestant, ContestantDocument } from './schemas/contestant.schema';
import { Vote, VoteDocument } from './schemas/vote.schema';
import { VotingCycle, VotingCycleDocument } from './schemas/voting-cycle.schema';

export interface CycleTally {
  contestantId: string;
  name: string;
  country: string;
  imageUrl: string;
  status: string;
  currentStage: string;
  cycleVotes: number;
  totalVotes: number;
}

export interface CycleDetail {
  cycle: VotingCycleDocument;
  tallies: CycleTally[];
  totalVotesInCycle: number;
}

export interface ContestantVoteHistoryEntry {
  cycleId: string;
  cycleName: string;
  cycleStatus: string;
  votesInCycle: number;
  startedAt: Date;
  closedAt?: Date;
}

@Injectable()
export class AdminVotingService {
  private readonly logger = new Logger(AdminVotingService.name);

  constructor(
    @InjectModel(VotingCycle.name) private readonly votingCycleModel: Model<VotingCycleDocument>,
    @InjectModel(Contestant.name) private readonly contestantModel: Model<ContestantDocument>,
    @InjectModel(Vote.name) private readonly voteModel: Model<VoteDocument>,
  ) {}

  /**
   * Get the current active voting cycle with contestant vote tallies.
   */
  async getCurrentCycle(): Promise<CycleDetail | null> {
    const cycle = await this.votingCycleModel.findOne({ status: 'active' }).lean();
    if (!cycle) return null;

    const tallies = await this.getVoteTalliesForCycle(String(cycle._id));
    const totalVotesInCycle = tallies.reduce((sum, t) => sum + t.cycleVotes, 0);

    return {
      cycle: cycle as unknown as VotingCycleDocument,
      tallies,
      totalVotesInCycle,
    };
  }

  /**
   * List all voting cycles, ordered by most recent first.
   */
  async listCycles(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, cycles] = await Promise.all([
      this.votingCycleModel.countDocuments(),
      this.votingCycleModel.find().sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data: cycles,
    };
  }

  /**
   * Get details for a specific voting cycle.
   */
  async getCycleDetail(cycleId: string): Promise<CycleDetail> {
    const cycle = await this.votingCycleModel.findById(cycleId).lean();
    if (!cycle) {
      throw new NotFoundException('Voting cycle not found');
    }

    const tallies = await this.getVoteTalliesForCycle(cycleId);
    const totalVotesInCycle = tallies.reduce((sum, t) => sum + t.cycleVotes, 0);

    return {
      cycle: cycle as unknown as VotingCycleDocument,
      tallies,
      totalVotesInCycle,
    };
  }

  /**
   * Start a new voting cycle. Automatically closes any existing active cycle.
   */
  async startNewCycle(name: string, adminId: string): Promise<VotingCycleDocument> {
    // Close any existing active cycle
    const existingActive = await this.votingCycleModel.findOne({ status: 'active' });
    if (existingActive) {
      existingActive.status = 'closed';
      existingActive.closedAt = new Date();
      await existingActive.save();
      this.logger.log(`Auto-closed previous cycle "${existingActive.name}" (${String(existingActive._id)})`);
    }

    const cycle = await this.votingCycleModel.create({
      name,
      status: 'active',
      startedAt: new Date(),
      createdBy: new Types.ObjectId(adminId),
    });

    this.logger.log(`New voting cycle "${name}" started by admin ${adminId}`);
    return cycle;
  }

  /**
   * Manually close a voting cycle.
   */
  async closeCycle(cycleId: string, adminId: string): Promise<VotingCycleDocument> {
    const cycle = await this.votingCycleModel.findById(cycleId);
    if (!cycle) {
      throw new NotFoundException('Voting cycle not found');
    }

    if (cycle.status === 'closed') {
      throw new BadRequestException('This voting cycle is already closed');
    }

    cycle.status = 'closed';
    cycle.closedAt = new Date();
    await cycle.save();

    this.logger.log(`Voting cycle "${cycle.name}" closed by admin ${adminId}`);
    return cycle;
  }

  /**
   * Eliminate a contestant from the current active voting cycle.
   */
  async eliminateContestant(
    contestantId: string,
    reason: string | undefined,
    adminId: string,
  ): Promise<ContestantDocument> {
    const activeCycle = await this.votingCycleModel.findOne({ status: 'active' });
    if (!activeCycle) {
      throw new BadRequestException('No active voting cycle. Cannot eliminate a contestant without an active cycle.');
    }

    const contestant = await this.contestantModel.findById(contestantId);
    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    if (contestant.status === 'eliminated') {
      throw new BadRequestException('Contestant is already eliminated');
    }

    contestant.status = 'eliminated';
    contestant.eliminatedAt = new Date();
    contestant.eliminatedInCycle = activeCycle._id as Types.ObjectId;
    await contestant.save();

    this.logger.log(
      `Contestant "${contestant.name}" (${contestantId}) eliminated by admin ${adminId}` +
        (reason ? ` — Reason: ${reason}` : ''),
    );

    return contestant;
  }

  /**
   * Get vote history for a specific contestant, grouped by voting cycle.
   */
  async getContestantVoteHistory(contestantId: string): Promise<ContestantVoteHistoryEntry[]> {
    const contestant = await this.contestantModel.findById(contestantId).lean();
    if (!contestant) {
      throw new NotFoundException('Contestant not found');
    }

    // Aggregation: group votes by votingCycle for this contestant
    const pipeline = [
      { $match: { contestant: new Types.ObjectId(contestantId), votingCycle: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$votingCycle',
          votesInCycle: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'votingcycles',
          localField: '_id',
          foreignField: '_id',
          as: 'cycle',
        },
      },
      { $unwind: '$cycle' },
      { $sort: { 'cycle.startedAt': -1 as const } },
    ];

    const results = await this.voteModel.aggregate(pipeline);

    return results.map((r) => ({
      cycleId: String(r._id),
      cycleName: r.cycle.name,
      cycleStatus: r.cycle.status,
      votesInCycle: r.votesInCycle,
      startedAt: r.cycle.startedAt,
      closedAt: r.cycle.closedAt,
    }));
  }

  /**
   * Private helper: Aggregate vote tallies per contestant for a specific cycle.
   */
  private async getVoteTalliesForCycle(cycleId: string): Promise<CycleTally[]> {
    // Get all active + eliminated contestants
    const contestants = await this.contestantModel
      .find({ status: { $in: ['active', 'eliminated', 'winner'] } })
      .sort({ votes: -1, name: 1 })
      .lean();

    if (contestants.length === 0) return [];

    // Aggregate votes for this specific cycle
    const voteCounts = await this.voteModel.aggregate([
      { $match: { votingCycle: new Types.ObjectId(cycleId) } },
      { $group: { _id: '$contestant', cycleVotes: { $sum: 1 } } },
    ]);

    const voteMap = new Map<string, number>();
    for (const vc of voteCounts) {
      voteMap.set(String(vc._id), vc.cycleVotes);
    }

    return contestants.map((c) => ({
      contestantId: String(c._id),
      name: c.name,
      country: c.country,
      imageUrl: c.imageUrl,
      status: c.status,
      currentStage: c.currentStage || 'Stage 1',
      cycleVotes: voteMap.get(String(c._id)) || 0,
      totalVotes: c.votes,
    }));
  }
}
