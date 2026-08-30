import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TriviaQuestion, TriviaQuestionDocument } from './schemas/trivia-question.schema';
import { TriviaResponse, TriviaResponseDocument } from './schemas/trivia-response.schema';
import { TriviaAnswerChangeLog, TriviaAnswerChangeLogDocument } from './schemas/trivia-answer-change-log.schema';
import { CreateTriviaDto } from './dto/create-trivia.dto';
import { UpdateTriviaDto } from './dto/update-trivia.dto';

export interface TriviaListFilters {
  page: number;
  limit: number;
  category?: string;
  isActive?: boolean;
  search?: string;
}

@Injectable()
export class AdminTriviaService {
  private readonly logger = new Logger(AdminTriviaService.name);

  constructor(
    @InjectModel(TriviaQuestion.name) private readonly triviaQuestionModel: Model<TriviaQuestionDocument>,
    @InjectModel(TriviaResponse.name) private readonly triviaResponseModel: Model<TriviaResponseDocument>,
    @InjectModel(TriviaAnswerChangeLog.name) private readonly changeLogModel: Model<TriviaAnswerChangeLogDocument>,
  ) {}

  /**
   * List trivia questions with filters, search, and pagination.
   */
  async listQuestions(filters: TriviaListFilters) {
    const { page, limit, category, isActive, search } = filters;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { isDeleted: { $ne: true } };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive;
    if (search) query.question = { $regex: search, $options: 'i' };

    const [total, questions] = await Promise.all([
      this.triviaQuestionModel.countDocuments(query),
      this.triviaQuestionModel
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
      data: questions,
    };
  }

  /**
   * Get summary stats for trivia questions.
   */
  async getStats() {
    const [total, active, inactive, totalResponses] = await Promise.all([
      this.triviaQuestionModel.countDocuments({ isDeleted: { $ne: true } }),
      this.triviaQuestionModel.countDocuments({ isDeleted: { $ne: true }, isActive: true }),
      this.triviaQuestionModel.countDocuments({ isDeleted: { $ne: true }, isActive: false }),
      this.triviaResponseModel.countDocuments(),
    ]);

    return { total, active, inactive, totalResponses };
  }

  /**
   * Get a single trivia question by ID with response count.
   */
  async getQuestionDetail(id: string) {
    const question = await this.triviaQuestionModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: { $ne: true },
    }).lean();

    if (!question) {
      throw new NotFoundException('Trivia question not found');
    }

    const responseCount = await this.triviaResponseModel.countDocuments({
      questionId: new Types.ObjectId(id),
    });

    const changeLogs = await this.changeLogModel
      .find({ questionId: new Types.ObjectId(id) })
      .sort({ changedAt: -1 })
      .lean();

    return { ...question, responseCount, changeLogs };
  }

  /**
   * Create a new trivia question.
   */
  async createQuestion(dto: CreateTriviaDto, adminId: string) {
    if (dto.correctAnswer >= dto.options.length) {
      throw new BadRequestException(
        `correctAnswer index (${dto.correctAnswer}) is out of bounds for options array (length ${dto.options.length})`,
      );
    }

    const question = await this.triviaQuestionModel.create({
      question: dto.question,
      options: dto.options,
      correctAnswer: dto.correctAnswer,
      category: dto.category || 'general',
      periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
      periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      isActive: true,
      isDeleted: false,
    });

    this.logger.log(`Admin ${adminId} created trivia question ${question._id}`);
    return question;
  }

  /**
   * Update a trivia question. If the correct answer changes and submissions
   * already exist, create a TriviaAnswerChangeLog entry (TRI-005).
   */
  async updateQuestion(id: string, dto: UpdateTriviaDto, adminId: string) {
    const question = await this.triviaQuestionModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!question) {
      throw new NotFoundException('Trivia question not found');
    }

    // TRI-005: Log change if correctAnswer is being modified
    if (dto.correctAnswer !== undefined && dto.correctAnswer !== question.correctAnswer) {
      const existingResponses = await this.triviaResponseModel.countDocuments({
        questionId: new Types.ObjectId(id),
      });

      if (existingResponses > 0) {
        await this.changeLogModel.create({
          questionId: new Types.ObjectId(id),
          previousCorrectAnswer: question.correctAnswer,
          newCorrectAnswer: dto.correctAnswer,
          changedBy: new Types.ObjectId(adminId),
          reason: dto.reason || 'Correct answer updated',
          affectedResponseCount: existingResponses,
          changedAt: new Date(),
        });

        this.logger.warn(
          `Admin ${adminId} changed correctAnswer on question ${id} from ${question.correctAnswer} to ${dto.correctAnswer} — ${existingResponses} existing responses affected`,
        );
      }
    }

    // Apply updates
    if (dto.question !== undefined) question.question = dto.question;
    if (dto.options !== undefined) question.options = dto.options;
    if (dto.correctAnswer !== undefined) question.correctAnswer = dto.correctAnswer;
    if (dto.category !== undefined) question.category = dto.category;
    if (dto.periodStart !== undefined) question.periodStart = new Date(dto.periodStart);
    if (dto.periodEnd !== undefined) question.periodEnd = new Date(dto.periodEnd);

    // Validate correctAnswer is in bounds after update
    if (question.correctAnswer >= question.options.length) {
      throw new BadRequestException(
        `correctAnswer index (${question.correctAnswer}) is out of bounds for options array (length ${question.options.length})`,
      );
    }

    await question.save();
    return question;
  }

  /**
   * Soft-delete a trivia question (preserves TriviaResponse history).
   */
  async deleteQuestion(id: string, adminId: string) {
    const question = await this.triviaQuestionModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!question) {
      throw new NotFoundException('Trivia question not found');
    }

    question.isDeleted = true;
    question.isActive = false;
    await question.save();

    this.logger.log(`Admin ${adminId} soft-deleted trivia question ${id}`);
    return { deleted: true, id };
  }

  /**
   * Toggle the isActive status of a trivia question.
   */
  async toggleActive(id: string, adminId: string) {
    const question = await this.triviaQuestionModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: { $ne: true },
    });

    if (!question) {
      throw new NotFoundException('Trivia question not found');
    }

    question.isActive = !question.isActive;
    await question.save();

    this.logger.log(`Admin ${adminId} toggled trivia question ${id} isActive to ${question.isActive}`);
    return { id, isActive: question.isActive };
  }
}
