import { Types } from 'mongoose';
import { Contestant, IContestant } from '../models/contestant.model';
import { Vote } from '../models/vote.model';

export interface LeaderboardEntry {
    rank: number;
    contestantId: string;
    name: string;
    country: string;
    votes: number;
    imageUrl: string;
}

function startOfDay(d: Date): Date {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    return t;
}

class VoteService {
    public async listContestants(): Promise<IContestant[]> {
        const contestants = await Contestant.find({ status: 'active' })
            .sort({ votes: -1, name: 1 })
            .lean();

        if (contestants.length > 0) return contestants;

        // Fallback sample data for initial frontend testing when DB is empty
        return [
            { _id: new Types.ObjectId(), name: 'Sarah Johnson', country: 'Kenya', bio: 'Adventure seeker with a passion for wildlife photography', votes: 245, imageUrl: 'https://example.com/sarah.jpg', status: 'active' } as any,
            { _id: new Types.ObjectId(), name: 'Michael Chen', country: 'South Africa', bio: 'Road trip enthusiast exploring Africa\'s hidden gems', votes: 189, imageUrl: 'https://example.com/michael.jpg', status: 'active' } as any,
            { _id: new Types.ObjectId(), name: 'Amina Diallo', country: 'Senegal', bio: 'Cultural explorer documenting traditional African lifestyles', votes: 156, imageUrl: 'https://example.com/amina.jpg', status: 'active' } as any,
            { _id: new Types.ObjectId(), name: 'David Okafor', country: 'Nigeria', bio: 'Motorcycle adventurer crossing borders and building bridges', votes: 112, imageUrl: 'https://example.com/david.jpg', status: 'active' } as any,
            { _id: new Types.ObjectId(), name: 'Elena Mwangi', country: 'Tanzania', bio: 'Solo female traveller promoting sustainable tourism', votes: 98, imageUrl: 'https://example.com/elena.jpg', status: 'active' } as any,
            { _id: new Types.ObjectId(), name: 'Ahmed Hassan', country: 'Egypt', bio: 'History buff tracing ancient trade routes across the continent', votes: 87, imageUrl: 'https://example.com/ahmed.jpg', status: 'active' } as any
        ];
    }

    public async leaderboard(limit = 6): Promise<LeaderboardEntry[]> {
        const contestants = await Contestant.find({ status: 'active' })
            .sort({ votes: -1, name: 1 })
            .limit(limit)
            .lean();

        const list = contestants.map((c, idx) => ({
            rank: idx + 1,
            contestantId: String(c._id),
            name: c.name,
            country: c.country,
            votes: c.votes,
            imageUrl: c.imageUrl
        }));

        if (list.length > 0) return list;

        const sample = await this.listContestants();
        return sample
            .sort((a, b) => b.votes - a.votes)
            .slice(0, limit)
            .map((c, idx) => ({
                rank: idx + 1,
                contestantId: String(c._id),
                name: c.name,
                country: c.country,
                votes: c.votes,
                imageUrl: c.imageUrl
            }));
    }

    public async voteFavorite(touristId: string, contestantId: string): Promise<{ message: string; votes: number }> {
        const contestant = await Contestant.findOne({ _id: contestantId, status: 'active' });
        if (!contestant) {
            throw new Error('Contestant not found or inactive');
        }

        const today = startOfDay(new Date());

        // Enforce one vote per contestant per day per user
        const existing = await Vote.findOne({
            tourist: new Types.ObjectId(touristId),
            contestant: new Types.ObjectId(contestantId),
            voteDate: today
        });

        if (existing) {
            throw new Error('You have already voted for this contestant today');
        }

        await Vote.create({
            tourist: new Types.ObjectId(touristId),
            contestant: new Types.ObjectId(contestantId),
            voteDate: today
        });

        contestant.votes += 1;
        await contestant.save();

        return { message: 'Vote recorded', votes: contestant.votes };
    }
}

export const voteService = new VoteService();