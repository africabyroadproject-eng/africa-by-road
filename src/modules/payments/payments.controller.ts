import { BadRequestException, Body, Controller, Get, Headers, HttpCode, HttpStatus, NotFoundException, Post, RawBodyRequest, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Model } from 'mongoose';
import { Tourist, TouristDocument } from '../auth/schemas/tourist.schema';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { MeCashService } from './services/mecash.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly meCashService: MeCashService,
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
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

    await this.meCashService.handleWebhook(body);
    return { message: 'Webhook processed' };
  }
}
