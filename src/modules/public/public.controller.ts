import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../payments/payment.service';
import { ContentService } from './content.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(
    private readonly contentService: ContentService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get('landing-page')
  @ApiOperation({ summary: 'Get landing page content' })
  getLandingPage() {
    return { message: 'Landing page content retrieved successfully', data: this.contentService.getLandingPageContent() };
  }

  @Get('payment-gateway-options')
  @ApiOperation({ summary: 'Get available payment gateways' })
  getPaymentGatewayOptions(@Query('country') country?: string) {
    return { message: 'Payment gateway options retrieved successfully', data: this.paymentService.getGatewayOptions(country) };
  }
}
