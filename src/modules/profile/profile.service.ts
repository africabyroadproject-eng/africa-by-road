import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tourist, TouristDocument } from '../auth/schemas/tourist.schema';
import { PersonalInfoDto } from './dto/personal-info.dto';
import { SocialMediaDto } from './dto/social-media.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { getMissingRegistrationFields, REQUIRED_REGISTRATION_FIELDS, syncRegistrationStatus } from '../../common/utils/registration';
import { DocumentStorageService } from './document-storage.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
    private readonly documentStorage: DocumentStorageService,
  ) {}

  private async getUserOrThrow(id: string): Promise<TouristDocument> {
    const user = await this.touristModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getProfile(touristId: string) {
    const user = await this.getUserOrThrow(touristId);

    return {
      message: 'Profile retrieved',
      profile: {
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        dateOfBirth: user.dateOfBirth,
        nationality: user.nationality,
        state: user.state,
        city: user.city,
        residentialAddress: user.residentialAddress,
        phoneNumber: user.phoneNumber,
        socialMedia: user.socialMedia,
        governmentId: user.governmentId ? { name: user.governmentId.name, uploadedAt: user.governmentId.uploadedAt } : null,
        proofOfAddress: user.proofOfAddress ? { name: user.proofOfAddress.name, uploadedAt: user.proofOfAddress.uploadedAt } : null,
        medicalRecords: user.medicalRecords ? { name: user.medicalRecords.name, uploadedAt: user.medicalRecords.uploadedAt } : null,
        isPaid: user.isPaid,
        registrationStatus: user.registrationStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async updatePersonalInfo(touristId: string, dto: PersonalInfoDto) {
    const user = await this.getUserOrThrow(touristId);

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.middleName !== undefined) user.middleName = dto.middleName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.dateOfBirth !== undefined) user.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.nationality !== undefined) user.nationality = dto.nationality;
    if (dto.state !== undefined) user.state = dto.state;
    if (dto.city !== undefined) user.city = dto.city;
    if (dto.residentialAddress !== undefined) user.residentialAddress = dto.residentialAddress;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;

    syncRegistrationStatus(user);
    await user.save();

    return { message: 'Personal info updated', registrationStatus: user.registrationStatus };
  }

  async updateSocialMedia(touristId: string, dto: SocialMediaDto) {
    const user = await this.getUserOrThrow(touristId);

    user.socialMedia = {
      ...(user.socialMedia || {}),
      ...(dto.instagram !== undefined ? { instagram: dto.instagram } : {}),
      ...(dto.facebook !== undefined ? { facebook: dto.facebook } : {}),
      ...(dto.twitter !== undefined ? { twitter: dto.twitter } : {}),
      ...(dto.tiktok !== undefined ? { tiktok: dto.tiktok } : {}),
      ...(dto.youtube !== undefined ? { youtube: dto.youtube } : {}),
    };
    syncRegistrationStatus(user);
    await user.save();

    return { message: 'Social media updated' };
  }

  async uploadDocument(touristId: string, dto: UploadDocumentDto, file: Express.Multer.File) {
    const user = await this.getUserOrThrow(touristId);
    const docData = await this.documentStorage.upload(file, touristId, dto.type);

    if (dto.type === 'governmentId') user.governmentId = docData;
    else if (dto.type === 'proofOfAddress') user.proofOfAddress = docData;
    else user.medicalRecords = docData;

    syncRegistrationStatus(user);
    await user.save();

    return { message: 'Document uploaded', documentType: dto.type };
  }

  async getRegistrationStatus(touristId: string) {
    const user = await this.getUserOrThrow(touristId);
    const missingFields = this.getMissingFields(user);
    const progress = this.calculateProgress(user);

    return {
      registrationStatus: user.registrationStatus,
      isPaid: user.isPaid,
      progress,
      missingFields,
      nextStep: missingFields.length > 0 ? missingFields[0] : null,
    };
  }

  private getMissingFields(user: TouristDocument): string[] {
    return getMissingRegistrationFields(user);
  }

  private calculateProgress(user: TouristDocument): number {
    const total = REQUIRED_REGISTRATION_FIELDS.length + 1;
    return Math.round(((total - getMissingRegistrationFields(user).length) / total) * 100);
  }
}
