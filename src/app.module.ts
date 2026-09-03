import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { AuditLog, AuditLogSchema } from './common/schemas/audit-log.schema';
import { AuditService } from './common/services/audit.service';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { validateEnvironment } from './config/env.validation';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProfileModule } from './modules/profile/profile.module';
import { AppFeatureModule } from './modules/app/app-feature.module';
import { PublicModule } from './modules/public/public.module';
import { CommunityModule } from './modules/community/community.module';
import { GiveawayModule } from './modules/giveaway/giveaway.module';
import { VoteModule } from './modules/vote/vote.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, databaseConfig],
      validate: validateEnvironment,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        // This project does not yet have a separate migration job. Keep index
        // creation enabled so uniqueness constraints also exist on a fresh
        // Atlas database.
        autoIndex: process.env.NODE_ENV !== 'production',
        maxPoolSize: 10,
        minPoolSize: 0,
        wtimeoutMS: 10000,
        connectTimeoutMS: 20000,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 20000,
        family: 4,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 15 * 60 * 1000,
        limit: 100,
      },
    ]),
    AuthModule,
    AdminModule,
    ProfileModule,
    AppFeatureModule,
    PublicModule,
    CommunityModule,
    GiveawayModule,
    VoteModule,
    PaymentsModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AuditService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfMiddleware, AuditMiddleware).forRoutes('*');
  }
}
