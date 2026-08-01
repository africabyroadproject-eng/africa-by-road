import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GiveawaySpin, GiveawaySpinDocument } from './schemas/giveaway-spin.schema';
import { TriviaQuestion, TriviaQuestionDocument } from './schemas/trivia-question.schema';
import { TriviaResponse, TriviaResponseDocument } from './schemas/trivia-response.schema';

function startOfDay(d: Date): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

const SPIN_PRIZES = ['Travel Backpack', 'Water Bottle', 'Car Phone Mount', 'Fuel Voucher', 'Map Guide', 'Sticker Pack', 'No Win'];
const TRIVIA_PRIZES = ['Free Safari Trip', 'Travel Camera', '$100 Gift Card', 'Camping Gear Set', 'Hiking Backpack', 'Travel Voucher'];

interface MongoDuplicateKeyError {
  code?: number;
}

@Injectable()
export class GiveawayService {
  constructor(
    @InjectModel(GiveawaySpin.name) private readonly giveawaySpinModel: Model<GiveawaySpinDocument>,
    @InjectModel(TriviaQuestion.name) private readonly triviaQuestionModel: Model<TriviaQuestionDocument>,
    @InjectModel(TriviaResponse.name) private readonly triviaResponseModel: Model<TriviaResponseDocument>,
  ) {}

  async spinStatus(touristId: string) {
    const today = startOfDay(new Date());
    const spin = await this.giveawaySpinModel.findOne({ tourist: new Types.ObjectId(touristId), gameType: 'spin', spinDate: today });
    const trivia = await this.triviaResponseModel.findOne({ tourist: new Types.ObjectId(touristId), triviaDate: today });

    return {
      spinsRemaining: spin ? 0 : 1,
      triviaRemaining: trivia ? 0 : 1,
      message: spin ? 'No free spins left today.' : 'You have 1 free spin today. Good luck!',
    };
  }

  async spin(touristId: string) {
    const today = startOfDay(new Date());
    const prize = SPIN_PRIZES[Math.floor(Math.random() * SPIN_PRIZES.length)];

    try {
      const spin = await this.giveawaySpinModel.create({
        tourist: new Types.ObjectId(touristId),
        gameType: 'spin',
        spinDate: today,
        prize,
      });
      return { prize: spin.prize, message: 'Spin completed' };
    } catch (err) {
      if ((err as MongoDuplicateKeyError).code === 11000) {
        throw new BadRequestException('You have already used your free spin today');
      }
      throw err;
    }
  }

  async getTriviaQuestion() {
    const question = await this.triviaQuestionModel.findOne({ isActive: true }).lean();
    if (!question) {
      const defaultQuestion = await this.triviaQuestionModel.findOne({ category: 'default' }).lean();
      if (defaultQuestion) return defaultQuestion;
      return {
        _id: 'default',
        question: 'Which African country is home to the largest number of Africa by Road community members?',
        options: ['Kenya', 'South Africa', 'Nigeria', 'Egypt'],
        correctAnswer: 0,
        category: 'default',
      };
    }
    return question;
  }

  async submitTriviaAnswer(touristId: string, questionId: string, selectedAnswer: number) {
    const today = startOfDay(new Date());

    let isCorrect = false;
    let correctAnswer = 0;

    if (questionId === 'default') {
      isCorrect = selectedAnswer === 0;
      correctAnswer = 0;
    } else {
      const question = await this.triviaQuestionModel.findById(questionId);
      if (question) {
        isCorrect = question.correctAnswer === selectedAnswer;
        correctAnswer = question.correctAnswer;
      }
    }

    const prize = isCorrect ? TRIVIA_PRIZES[Math.floor(Math.random() * TRIVIA_PRIZES.length)] : 'No Win';

    if (questionId !== 'default') {
      try {
        await this.triviaResponseModel.create({
          tourist: new Types.ObjectId(touristId),
          questionId: new Types.ObjectId(questionId),
          selectedAnswer,
          isCorrect,
          triviaDate: today,
        });
      } catch (err) {
        if ((err as MongoDuplicateKeyError).code === 11000) {
          throw new BadRequestException('You have already played trivia today');
        }
        throw err;
      }
    }

    if (isCorrect) {
      await this.giveawaySpinModel.create({
        tourist: new Types.ObjectId(touristId),
        gameType: 'trivia',
        spinDate: new Date(),
        prize,
      });
    }

    return { isCorrect, correctAnswer, prize };
  }

  async getTodaysWinners() {
    const today = startOfDay(new Date());
    const wins = await this.giveawaySpinModel
      .find({ spinDate: { $gte: today }, prize: { $ne: 'No Win' } })
      .sort({ spinDate: -1 })
      .limit(20)
      .populate('tourist', 'firstName lastName')
      .lean();

    const winners = wins.map((win, idx) => {
      const tourist = win.tourist as unknown as { firstName?: string; lastName?: string };
      return {
        rank: idx + 1,
        name: `${tourist?.firstName || ''} ${tourist?.lastName || ''}`.trim(),
        prize: win.prize,
        gameType: win.gameType,
        wonAt: win.spinDate,
      };
    });

    return { count: winners.length, winners };
  }

  async getSpinDetail(spinId: string) {
    const spin = await this.giveawaySpinModel.findById(spinId).populate('tourist', 'firstName lastName').lean();
    if (!spin) {
      throw new NotFoundException('Spin not found');
    }
    return spin;
  }
}
