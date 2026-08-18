import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contestant, ContestantDocument } from './schemas/contestant.schema';
import { Vote, VoteDocument } from './schemas/vote.schema';
import { VotingCycle, VotingCycleDocument } from './schemas/voting-cycle.schema';

export interface LeaderboardEntry {
  rank: number;
  contestantId: string;
  name: string;
  country: string;
  votes: number;
  imageUrl: string;
}

interface MongoDuplicateKeyError {
  code?: number;
}

function startOfDay(d: Date): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

@Injectable()
export class VoteService {
  constructor(
    @InjectModel(Contestant.name) private readonly contestantModel: Model<ContestantDocument>,
    @InjectModel(Vote.name) private readonly voteModel: Model<VoteDocument>,
    @InjectModel(VotingCycle.name) private readonly votingCycleModel: Model<VotingCycleDocument>,
  ) {}

  /**
   * Returns the currently active voting cycle, or null if none exists.
   */
  async getCurrentCycle() {
    return this.votingCycleModel.findOne({ status: 'active' }).lean();
  }

  async listContestants(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, contestants] = await Promise.all([
      this.contestantModel.countDocuments({ status: 'active' }),
      this.contestantModel.find({ status: 'active' }).sort({ votes: -1, name: 1 }).skip(skip).limit(limit).lean(),
    ]);

    if (contestants.length > 0) {
      return { total, page, limit, totalPages: Math.ceil(total / limit) || 1, data: contestants };
    }

    return { total: 0, page, limit, totalPages: 0, data: [] };
  }

  async leaderboard(limit = 6): Promise<LeaderboardEntry[]> {
    const contestants = await this.contestantModel.find({ status: 'active' }).sort({ votes: -1, name: 1 }).limit(limit).lean();

    const list = contestants.map((c, idx) => ({
      rank: idx + 1,
      contestantId: String(c._id),
      name: c.name,
      country: c.country,
      votes: c.votes,
      imageUrl: c.imageUrl,
    }));

    if (list.length > 0) return list;

    const result = await this.listContestants(1, limit);
    return result.data
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit)
      .map((c, idx) => ({
        rank: idx + 1,
        contestantId: String(c._id),
        name: c.name,
        country: c.country,
        votes: c.votes,
        imageUrl: c.imageUrl,
      }));
  }

  async voteFavorite(touristId: string, contestantId: string): Promise<{ message: string; votes: number }> {
    // Enforce active voting cycle (PVOT-001)
    const activeCycle = await this.getCurrentCycle();
    if (!activeCycle) {
      throw new BadRequestException('No active voting cycle. Voting is currently closed.');
    }

    const contestant = await this.contestantModel.findOne({ _id: contestantId, status: 'active' });
    if (!contestant) {
      throw new BadRequestException('Contestant not found or inactive');
    }

    // Reject votes for eliminated contestants
    if (contestant.status === 'eliminated') {
      throw new BadRequestException('This contestant has been eliminated and cannot receive votes');
    }

    const today = startOfDay(new Date());
    const touristOid = new Types.ObjectId(touristId);
    const contestantOid = new Types.ObjectId(contestantId);

    try {
      await this.voteModel.create({
        tourist: touristOid,
        contestant: contestantOid,
        votingCycle: activeCycle._id,
        voteDate: today,
      });
    } catch (err) {
      if ((err as MongoDuplicateKeyError).code === 11000) {
        throw new BadRequestException('You have already voted for this contestant today');
      }
      throw err;
    }

    const updated = await this.contestantModel.findByIdAndUpdate(contestantId, { $inc: { votes: 1 } }, { new: true });
    return { message: 'Vote recorded', votes: updated?.votes || contestant.votes + 1 };
  }
}

