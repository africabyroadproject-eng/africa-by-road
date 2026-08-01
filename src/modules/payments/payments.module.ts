import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { MeCashService } from './services/mecash.service';
import { PaystackService } from './services/paystack.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentService, MeCashService, PaystackService],
  exports: [PaymentService],
})
export class PaymentsModule {}
