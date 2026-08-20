import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminService } from './admin.service';
import { Admin, AdminSchema } from './schemas/admin.schema';
import { Tourist, TouristSchema } from '../auth/schemas/tourist.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: Tourist.name, schema: TouristSchema },
    ]),
  ],
  controllers: [AdminUsersController],
  providers: [AdminService, AdminUsersService],
  exports: [AdminService, AdminUsersService],
})
export class AdminModule {}
