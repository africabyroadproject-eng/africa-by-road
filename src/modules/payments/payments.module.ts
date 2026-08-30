import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { PaymentService } from './payment.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { MeCashService } from './services/mecash.service';
import { PaystackService } from './services/paystack.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentService, MeCashService, PaystackService],
  exports: [PaymentService],
})
export class PaymentsModule {}
