import { GiveawaySpin } from '../models/giveawaySpin.model';
import { TriviaQuestion, TriviaResponse } from '../models/trivia.model';
import { Tourist } from '../models/tourist.model';
import { Types } from 'mongoose';

function startOfDay(d: Date): Date {
    const t = new Date(d);
    t.setHours(0, 0, 0, 0);
    return t;
}

const SPIN_PRIZES = [
    'Travel Backpack',
    'Water Bottle',
    'Car Phone Mount',
    'Fuel Voucher',
    'Map Guide',
    'Sticker Pack',
    'No Win'
];

const TRIVIA_PRIZES = [
    'Free Safari Trip',
    'Travel Camera',
    '$100 Gift Card',
    'Camping Gear Set',
    'Hiking Backpack',
    'Travel Voucher'
];

class GiveawayService {
    public async spinStatus(touristId: string) {
        const today = startOfDay(new Date());
        const spin = await GiveawaySpin.findOne({
            tourist: new Types.ObjectId(touristId),
            gameType: 'spin',
            spinDate: today
        });
        const trivia = await TriviaResponse.findOne({
            tourist: new Types.ObjectId(touristId),
            respondedAt: { $gte: today }
        });

        return {
            spinsRemaining: spin ? 0 : 1,
            triviaRemaining: trivia ? 0 : 1,
            message: spin ? 'No free spins left today.' : 'You have 1 free spin today. Good luck!'
        };
    }

    public async spin(touristId: string) {
        const today = startOfDay(new Date());
        const existing = await GiveawaySpin.findOne({
            tourist: new Types.ObjectId(touristId),
            gameType: 'spin',
            spinDate: today
        });
        if (existing) {
            throw new Error('You have already used your free spin today');
        }

        const prize = SPIN_PRIZES[Math.floor(Math.random() * SPIN_PRIZES.length)];
        const spin = await GiveawaySpin.create({
            tourist: new Types.ObjectId(touristId),
            gameType: 'spin',
            spinDate: today,
            prize
        });

        return { prize: spin.prize, message: 'Spin completed' };
    }

    public async getTriviaQuestion() {
        const question = await TriviaQuestion.findOne({ isActive: true }).lean();
        if (!question) {
            const defaultQuestion = await TriviaQuestion.findOne({ category: 'default' }).lean();
            if (defaultQuestion) return defaultQuestion;
            return {
                _id: 'default',
                question: 'Which African country is home to the largest number of Africa by Road community members?',
                options: ['Kenya', 'South Africa', 'Nigeria', 'Egypt'],
                correctAnswer: 0,
                category: 'default'
            };
        }
        return question;
    }

    public async submitTriviaAnswer(touristId: string, questionId: string, selectedAnswer: number) {
        const today = startOfDay(new Date());
        const alreadyPlayed = await TriviaResponse.findOne({
            tourist: new Types.ObjectId(touristId),
            respondedAt: { $gte: today }
        });
        if (alreadyPlayed) {
            throw new Error('You have already played trivia today');
        }

        let isCorrect = false;
        let correctAnswer = 0;

        if (questionId === 'default') {
            isCorrect = selectedAnswer === 0;
            correctAnswer = 0;
        } else {
            const question = await TriviaQuestion.findById(questionId);
            if (question) {
                isCorrect = question.correctAnswer === selectedAnswer;
                correctAnswer = question.correctAnswer;
            }
        }

        const prize = isCorrect ? TRIVIA_PRIZES[Math.floor(Math.random() * TRIVIA_PRIZES.length)] : 'No Win';

        await TriviaResponse.create({
            tourist: new Types.ObjectId(touristId),
            questionId: new Types.ObjectId(questionId),
            selectedAnswer,
            isCorrect
        });

        if (isCorrect) {
            await GiveawaySpin.create({
                tourist: new Types.ObjectId(touristId),
                gameType: 'trivia',
                spinDate: new Date(),
                prize
            });
        }

        return { isCorrect, correctAnswer, prize };
    }

    public async getTodaysWinners() {
        const today = startOfDay(new Date());
        const wins = await GiveawaySpin.find({
            spinDate: { $gte: today },
            prize: { $ne: 'No Win' }
        })
            .sort({ spinDate: -1 })
            .limit(20)
            .populate('tourist', 'firstName lastName')
            .lean();

        const winners = wins.map((win: any, idx) => ({
            rank: idx + 1,
            name: `${win.tourist?.firstName} ${win.tourist?.lastName}`.trim(),
            prize: win.prize,
            gameType: win.gameType,
            wonAt: win.spinDate
        }));

        return { count: winners.length, winners };
    }

    public async getWinnersByGameType(gameType: 'spin' | 'trivia') {
        const today = startOfDay(new Date());
        const wins = await GiveawaySpin.find({
            gameType,
            spinDate: { $gte: today },
            prize: { $ne: 'No Win' }
        })
            .sort({ spinDate: -1 })
            .populate('tourist', 'firstName lastName')
            .lean();

        return wins.map((win: any, idx) => ({
            rank: idx + 1,
            name: `${win.tourist?.firstName} ${win.tourist?.lastName}`.trim(),
            prize: win.prize
        }));
    }
}

export const giveawayService = new GiveawayService();