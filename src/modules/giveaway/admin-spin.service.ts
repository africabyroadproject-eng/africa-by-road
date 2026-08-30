import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prize, PrizeDocument } from './schemas/prize.schema';
import { PrizeSnapshot, PrizeSnapshotDocument } from './schemas/prize-snapshot.schema';
import { CreatePrizeDto } from './dto/create-prize.dto';
import { UpdatePrizeDto } from './dto/update-prize.dto';

const MAX_PRIZE_SLOTS = 10;

@Injectable()
export class AdminSpinService {
  private readonly logger = new Logger(AdminSpinService.name);

  constructor(
    @InjectModel(Prize.name) private readonly prizeModel: Model<PrizeDocument>,
    @InjectModel(PrizeSnapshot.name) private readonly prizeSnapshotModel: Model<PrizeSnapshotDocument>,
  ) {}

  /**
   * List all prize slots (non-deleted).
   */
  async listPrizes() {
    const prizes = await this.prizeModel
      .find({ isDeleted: false })
      .sort({ position: 1 })
      .lean();

    return { count: prizes.length, maxSlots: MAX_PRIZE_SLOTS, data: prizes };
  }

  /**
   * Get summary stats for prizes.
   */
  async getStats() {
    const prizes = await this.prizeModel.find({ isDeleted: false }).lean();
    const activeSlots = prizes.filter((p) => p.isActive).length;
    const totalStock = prizes.reduce((sum, p) => sum + p.quantity, 0);
    const totalAwards = await this.prizeSnapshotModel.countDocuments();

    return {
      totalSlots: prizes.length,
      maxSlots: MAX_PRIZE_SLOTS,
      activeSlots,
      inactiveSlots: prizes.length - activeSlots,
      totalStock,
      totalAwards,
    };
  }

  /**
   * Get a single prize by ID with award count.
   */
  async getPrizeDetail(id: string) {
    const prize = await this.prizeModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    }).lean();

    if (!prize) {
      throw new NotFoundException('Prize not found');
    }

    const awardCount = await this.prizeSnapshotModel.countDocuments({
      prize: new Types.ObjectId(id),
    });

    return { ...prize, awardCount };
  }

  /**
   * Create a new prize slot. Enforces the max 10 non-deleted slot limit.
   */
  async createPrize(dto: CreatePrizeDto, adminId: string) {
    const existingCount = await this.prizeModel.countDocuments({ isDeleted: false });
    if (existingCount >= MAX_PRIZE_SLOTS) {
      throw new BadRequestException(
        `Cannot create prize: maximum of ${MAX_PRIZE_SLOTS} prize slots reached. Delete an existing slot first.`,
      );
    }

    // Check position uniqueness among non-deleted prizes
    const positionConflict = await this.prizeModel.findOne({
      position: dto.position,
      isDeleted: false,
    });
    if (positionConflict) {
      throw new ConflictException(
        `Position ${dto.position} is already occupied by prize "${positionConflict.name}". Choose a different position or update the existing prize.`,
      );
    }

    const prize = await this.prizeModel.create({
      name: dto.name,
      description: dto.description,
      imageUrl: dto.imageUrl,
      quantity: dto.quantity,
      weight: dto.weight,
      position: dto.position,
      isActive: true,
      isDeleted: false,
    });

    this.logger.log(`Admin ${adminId} created prize slot "${dto.name}" at position ${dto.position}`);
    return prize;
  }

  /**
   * Update a prize slot's properties.
   */
  async updatePrize(id: string, dto: UpdatePrizeDto, adminId: string) {
    const prize = await this.prizeModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!prize) {
      throw new NotFoundException('Prize not found');
    }

    // If position is being changed, check for conflicts
    if (dto.position !== undefined && dto.position !== prize.position) {
      const positionConflict = await this.prizeModel.findOne({
        position: dto.position,
        isDeleted: false,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (positionConflict) {
        throw new ConflictException(
          `Position ${dto.position} is already occupied by prize "${positionConflict.name}".`,
        );
      }
    }

    if (dto.name !== undefined) prize.name = dto.name;
    if (dto.description !== undefined) prize.description = dto.description;
    if (dto.imageUrl !== undefined) prize.imageUrl = dto.imageUrl;
    if (dto.quantity !== undefined) prize.quantity = dto.quantity;
    if (dto.weight !== undefined) prize.weight = dto.weight;
    if (dto.position !== undefined) prize.position = dto.position;

    await prize.save();

    this.logger.log(`Admin ${adminId} updated prize slot ${id}`);
    return prize;
  }

  /**
   * Delete a prize slot (soft-delete to preserve PrizeSnapshot history).
   */
  async deletePrize(id: string, adminId: string) {
    const prize = await this.prizeModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!prize) {
      throw new NotFoundException('Prize not found');
    }

    prize.isDeleted = true;
    prize.isActive = false;
    await prize.save();

    this.logger.log(`Admin ${adminId} deleted prize slot "${prize.name}" (position ${prize.position})`);
    return { deleted: true, id };
  }

  /**
   * Toggle the isActive status of a prize slot.
   */
  async toggleActive(id: string, adminId: string) {
    const prize = await this.prizeModel.findOne({
      _id: new Types.ObjectId(id),
      isDeleted: false,
    });

    if (!prize) {
      throw new NotFoundException('Prize not found');
    }

    prize.isActive = !prize.isActive;
    await prize.save();

    this.logger.log(`Admin ${adminId} toggled prize "${prize.name}" isActive to ${prize.isActive}`);
    return { id, isActive: prize.isActive };
  }
}
