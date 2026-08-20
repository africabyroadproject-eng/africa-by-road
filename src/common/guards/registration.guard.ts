import { CanActivate, ExecutionContext, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model } from 'mongoose';
import { Tourist, TouristDocument } from '../../modules/auth/schemas/tourist.schema';
import { getMissingRegistrationFields } from '../utils/registration';

@Injectable()
export class RegistrationGuard implements CanActivate {
  constructor(@InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    try {
      const user = await this.touristModel.findById((req.user as any)?.id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.isEmailVerified) {
        throw new ForbiddenException('Email verification required');
      }

      const requiredFields = getMissingRegistrationFields(user);
      if (requiredFields.length > 0) {
        throw new ForbiddenException({
          message: 'Registration incomplete',
          registrationStatus: user.registrationStatus,
          requiredFields,
        });
      }

      return true;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Server error checking registration status');
    }
  }
}
