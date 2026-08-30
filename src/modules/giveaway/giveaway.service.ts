import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GiveawaySpin, GiveawaySpinDocument } from './schemas/giveaway-spin.schema';
import { TriviaQuestion, TriviaQuestionDocument } from './schemas/trivia-question.schema';
import { TriviaResponse, TriviaResponseDocument } from './schemas/trivia-response.schema';
import { Prize, PrizeDocument } from './schemas/prize.schema';

/** Lean representation of a Prize document (returned by .lean()) */
interface LeanPrize {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  weight: number;
  position: number;
  isActive: boolean;
  isDeleted: boolean;
}
import { PrizeSnapshot, PrizeSnapshotDocument } from './schemas/prize-snapshot.schema';

function startOfDay(d: Date): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

interface MongoDuplicateKeyError {
  code?: number;
}

@Injectable()
export class GiveawayService {
  private readonly logger = new Logger(GiveawayService.name);

  constructor(
    @InjectModel(GiveawaySpin.name) private readonly giveawaySpinModel: Model<GiveawaySpinDocument>,
    @InjectModel(TriviaQuestion.name) private readonly triviaQuestionModel: Model<TriviaQuestionDocument>,
    @InjectModel(TriviaResponse.name) private readonly triviaResponseModel: Model<TriviaResponseDocument>,
    @InjectModel(Prize.name) private readonly prizeModel: Model<PrizeDocument>,
    @InjectModel(PrizeSnapshot.name) private readonly prizeSnapshotModel: Model<PrizeSnapshotDocument>,
  ) {}

  async spinStatus(touristId: string) {
    const today = startOfDay(new Date());
    const spin = await this.giveawaySpinModel.findOne({ tourist: new Types.ObjectId(touristId), gameType: 'spin', spinDate: today });
    const trivia = await this.triviaResponseModel.findOne({ tourist: new Types.ObjectId(touristId), triviaDate: today });

    const prizesAvailable = await this.prizeModel.countDocuments({
      isActive: true,
      isDeleted: false,
      quantity: { $gt: 0 },
    });

    return {
      spinsRemaining: spin ? 0 : 1,
      triviaRemaining: trivia ? 0 : 1,
      prizesAvailable,
      message: spin ? 'No free spins left today.' : 'You have 1 free spin today. Good luck!',
    };
  }

  /**
   * Perform a spin using weighted random selection from database prize slots.
   *
   * 1. Fetch all active, in-stock prizes
   * 2. Apply weighted random selection
   * 3. Atomically decrement stock ($inc: { quantity: -1 } with $gt: 0 guard)
   * 4. Create immutable PrizeSnapshot record
   * 5. Record the spin in GiveawaySpin
   */
  async spin(touristId: string) {
    const today = startOfDay(new Date());

    // Fetch active prizes with stock remaining
    const activePrizes = await this.prizeModel
      .find({ isActive: true, isDeleted: false, quantity: { $gt: 0 } })
      .lean();

    // Select prize using weighted random algorithm
    const selectedPrize = this.weightedRandomSelect(activePrizes);
    const prizeName = selectedPrize ? selectedPrize.name : 'No Win';

    let prizeSnapshotId: Types.ObjectId | undefined;

    // If a real prize was selected, atomically decrement stock
    if (selectedPrize) {
      const decremented = await this.prizeModel.findOneAndUpdate(
        { _id: selectedPrize._id, quantity: { $gt: 0 } },
        { $inc: { quantity: -1 } },
        { new: true },
      );

      if (!decremented) {
        // Race condition: prize went out of stock between query and update
        // Treat as "No Win" rather than failing
        this.logger.warn(`Prize ${selectedPrize.name} went out of stock during spin (race condition)`);
      } else {
        // Create immutable prize snapshot
        const snapshot = await this.prizeSnapshotModel.create({
          tourist: new Types.ObjectId(touristId),
          prize: selectedPrize._id,
          prizeNameSnapshot: selectedPrize.name,
          prizeDescriptionSnapshot: selectedPrize.description,
          prizeImageUrlSnapshot: selectedPrize.imageUrl,
          prizePositionSnapshot: selectedPrize.position,
          awardedAt: new Date(),
        });
        prizeSnapshotId = snapshot._id as Types.ObjectId;
      }
    }

    const finalPrizeName = prizeSnapshotId ? prizeName : 'No Win';

    try {
      const spin = await this.giveawaySpinModel.create({
        tourist: new Types.ObjectId(touristId),
        gameType: 'spin',
        spinDate: today,
        prize: finalPrizeName,
      });
      return { prize: spin.prize, message: 'Spin completed' };
    } catch (err) {
      if ((err as MongoDuplicateKeyError).code === 11000) {
        throw new BadRequestException('You have already used your free spin today');
      }
      throw err;
    }
  }

  /**
   * Weighted random selection from an array of prizes.
   * Returns null if no prizes are available (= "No Win").
   */
  private weightedRandomSelect(prizes: LeanPrize[]): LeanPrize | null {
    if (!prizes || prizes.length === 0) return null;

    const totalWeight = prizes.reduce((sum, p) => sum + (p.weight || 10), 0);
    let random = Math.random() * totalWeight;

    for (const prize of prizes) {
      random -= prize.weight || 10;
      if (random <= 0) {
        return prize;
      }
    }

    // Fallback (should not happen)
    return prizes[prizes.length - 1];
  }

  /**
   * Get the active trivia question, respecting time windows.
   *
   * A question is eligible if:
   * - isActive === true AND isDeleted === false
   * - Either no time window is set, OR now is within [periodStart, periodEnd]
   */
  async getTriviaQuestion() {
    const now = new Date();

    const question = await this.triviaQuestionModel.findOne({
      isActive: true,
      isDeleted: { $ne: true },
      $or: [
        // No time window set — always active
        { periodStart: { $exists: false }, periodEnd: { $exists: false } },
        { periodStart: null, periodEnd: null },
        // Within the time window
        { periodStart: { $lte: now }, periodEnd: { $gte: now } },
        // Only start set, no end
        { periodStart: { $lte: now }, periodEnd: null },
        { periodStart: { $lte: now }, periodEnd: { $exists: false } },
      ],
    }).lean();

    if (!question) {
      // Fallback default question when no active questions exist
      const defaultQuestion = await this.triviaQuestionModel.findOne({
        category: 'default',
        isDeleted: { $ne: true },
      }).lean();
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
    const now = new Date();

    let isCorrect = false;
    let correctAnswer = 0;

    if (questionId === 'default') {
      isCorrect = selectedAnswer === 0;
      correctAnswer = 0;
    } else {
      const question = await this.triviaQuestionModel.findById(questionId);
      if (!question) {
        throw new NotFoundException('Trivia question not found');
      }

      // Time window validation
      if (question.periodStart && now < question.periodStart) {
        throw new BadRequestException('This trivia question is not yet open for answers');
      }
      if (question.periodEnd && now > question.periodEnd) {
        throw new BadRequestException('This trivia question has expired and is no longer accepting answers');
      }

      isCorrect = question.correctAnswer === selectedAnswer;
      correctAnswer = question.correctAnswer;
    }

    // No hardcoded trivia prizes — trivia winners get a recognition record
    const prize = isCorrect ? 'Trivia Winner' : 'No Win';

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

  /**
   * Get spin history for a specific user (prize snapshots).
   */
  async getUserSpinHistory(touristId: string) {
    const snapshots = await this.prizeSnapshotModel
      .find({ tourist: new Types.ObjectId(touristId) })
      .sort({ awardedAt: -1 })
      .limit(50)
      .lean();

    return { count: snapshots.length, history: snapshots };
  }
}
