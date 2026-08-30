import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpStatus, Logger, NotFoundException, Post, Query, RawBodyRequest, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Model, Types } from 'mongoose';
import { Tourist, TouristDocument } from '../auth/schemas/tourist.schema';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { MeCashService } from './services/mecash.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly meCashService: MeCashService,
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  @Post('checkout')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create payment checkout with MeCash' })
  async createCheckout(@CurrentUser() user: TokenPayload, @Body() dto: CreateCheckoutDto) {
    const tourist = await this.touristModel.findById(user.id);
    if (!tourist) {
      throw new NotFoundException('Account not found. Please register first.');
    }
    if (!tourist.isEmailVerified) {
      throw new BadRequestException('Please verify your email before payment');
    }
    if (tourist.email !== dto.email.trim().toLowerCase()) {
      throw new BadRequestException('Checkout email must match the authenticated account');
    }

    if (dto.phoneNumber) {
      tourist.phoneNumber = dto.phoneNumber;
      await tourist.save();
    }

    const reference = this.meCashService.generateReference();
    const callbackUrl = process.env.PAYMENT_CALLBACK_URL || 'http://localhost:3000/api/payments/callback';

    const result = await this.meCashService.initializePayment({
      amount: 5000,
      currency: 'NGN',
      email: dto.email,
      reference,
      callbackUrl,
      description: 'Africa By Road Registration - $50 USD',
    });

    if (!result.status) {
      throw new BadRequestException(result.message || 'Failed to initiate payment');
    }

    // Create payment ledger entry with pending status
    await this.paymentModel.create({
      tourist: new Types.ObjectId(user.id),
      provider: 'mecash',
      reference: result.data?.reference || reference,
      amount: 5000,
      currency: 'NGN',
      status: 'pending',
      description: 'Africa By Road Registration - $50 USD',
    });

    return {
      message: 'Checkout initiated',
      data: {
        checkoutUrl: result.data?.paymentUrl,
        reference: result.data?.reference,
        amount: 5000,
        currency: 'NGN',
      },
    };
  }

  @Post('verify')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify payment status' })
  async verifyPayment(@CurrentUser() user: TokenPayload, @Body() dto: VerifyPaymentDto) {
    const result = await this.meCashService.verifyPayment(dto.reference);
    if (result.data?.customer?.email?.toLowerCase() !== user.email.toLowerCase()) {
      throw new NotFoundException('Payment not found');
    }

    // Update payment ledger if verification succeeds
    if (result.status && result.data) {
      await this.paymentModel.findOneAndUpdate(
        { reference: dto.reference, status: 'pending' },
        {
          status: 'success',
          confirmedAt: new Date(),
          providerTransactionId: (result.data as Record<string, unknown>)?.transactionId as string || undefined,
          metadata: result.data,
        },
      );
    }

    return {
      message: result.status ? 'Payment verified' : 'Payment not found',
      data: result.data,
    };
  }

  @Get('key')
  @ApiOperation({ summary: 'Get MeCash public key' })
  getPublicKey() {
    return {
      data: {
        publicKey: this.meCashService.getPublicKey(),
        isConfigured: this.meCashService.isConfigured(),
      },
    };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle MeCash webhook' })
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-mecash-signature') signature: string, @Body() body: any) {
    const rawBody = req.rawBody?.toString('utf8');

    if (!rawBody || !signature || !this.meCashService.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Idempotent webhook handling: check if payment is already confirmed
    const reference = body?.data?.reference || body?.reference;
    if (reference) {
      const existingPayment = await this.paymentModel.findOne({
        reference,
        status: 'success',
      });
      if (existingPayment) {
        this.logger.log(`Webhook for reference ${reference} already processed — skipping`);
        return { message: 'Webhook already processed' };
      }

      // Update payment ledger
      await this.paymentModel.findOneAndUpdate(
        { reference, status: 'pending' },
        {
          status: 'success',
          confirmedAt: new Date(),
          metadata: body?.data || body,
        },
      );
    }

    await this.meCashService.handleWebhook(body);
    return { message: 'Webhook processed' };
  }

  @Get('history')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment history for the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPaymentHistory(
    @CurrentUser() user: TokenPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit || '20', 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, payments] = await Promise.all([
      this.paymentModel.countDocuments({ tourist: new Types.ObjectId(user.id) }),
      this.paymentModel
        .find({ tourist: new Types.ObjectId(user.id) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    return {
      message: 'Payment history',
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      data: payments,
    };
  }
}
