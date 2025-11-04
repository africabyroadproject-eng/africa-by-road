import { GiveawaySpin } from '../models/giveawaySpin.model';
import { Types } from 'mongoose';

function startOfDay(d: Date): Date {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    return t;
}

const PRIZES = [
    'Travel Backpack',
    'Water Bottle',
    'Car Phone Mount',
    'Fuel Voucher',
    'Map Guide',
    'Sticker Pack',
    'No Win'
];

class GiveawayService {
    public async spinStatus(touristId: string) {
        const today = startOfDay(new Date());
        const existing = await GiveawaySpin.findOne({
            tourist: new Types.ObjectId(touristId),
            spinDate: today
        });
        return { spinsRemaining: existing ? 0 : 1, message: existing ? 'No free spins left today.' : 'You have 1 free spin today. Good luck!' };
    }

    public async spin(touristId: string) {
        const today = startOfDay(new Date());
        const existing = await GiveawaySpin.findOne({
            tourist: new Types.ObjectId(touristId),
            spinDate: today
        });
        if (existing) {
            throw new Error('You have already used your free spin today');
        }

        const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
        const spin = await GiveawaySpin.create({
            tourist: new Types.ObjectId(touristId),
            spinDate: today,
            prize
        });

        return { prize: spin.prize, message: 'Spin completed' };
    }
}

export const giveawayService = new GiveawayService();