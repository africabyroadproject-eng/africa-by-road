import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IDocumentUpload, Tourist, TouristDocument } from '../auth/schemas/tourist.schema';
import { PersonalInfoDto } from './dto/personal-info.dto';
import { SocialMediaDto } from './dto/social-media.dto';
import { SubmitAssessmentDto } from './dto/submit-assessment.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { getMissingRegistrationFields, REQUIRED_REGISTRATION_FIELDS, syncRegistrationStatus } from '../../common/utils/registration';
import { DocumentStorageService } from './document-storage.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>,
    private readonly documentStorage: DocumentStorageService,
  ) {}

  private formatDocumentInfo(doc?: IDocumentUpload) {
    if (!doc) return null;
    return {
      name: doc.name,
      url: doc.url || this.documentStorage.getDocumentUrl(doc.storageKey, doc.resourceType, doc.format) || undefined,
      uploadedAt: doc.uploadedAt,
    };
  }

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
        governmentId: this.formatDocumentInfo(user.governmentId),
        proofOfAddress: this.formatDocumentInfo(user.proofOfAddress),
        medicalRecords: this.formatDocumentInfo(user.medicalRecords),
        isPaid: user.isPaid,
        registrationStatus: user.registrationStatus,
        qualificationStep: user.qualificationStep || 1,
        completedSteps: user.completedSteps || [],
        assessmentCompleted: Boolean(user.assessmentCompleted),
        assessmentAnswers: user.assessmentAnswers || {},
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

  async submitAssessment(touristId: string, dto: SubmitAssessmentDto) {
    const user = await this.getUserOrThrow(touristId);

    user.completedSteps = user.completedSteps || [];
    user.assessmentAnswers = user.assessmentAnswers || {};

    user.assessmentAnswers[dto.step] = {
      completedItems: dto.completedItems || [],
      answers: dto.answers || {},
      submittedAt: new Date(),
    };

    if (!user.completedSteps.includes(dto.step)) {
      user.completedSteps.push(dto.step);
    }

    let nextStepName: string | null = null;

    if (dto.step === 'requirements') {
      if ((user.qualificationStep || 1) <= 2) user.qualificationStep = 3;
      nextStepName = 'personality_test';
    } else if (dto.step === 'personality_test') {
      if ((user.qualificationStep || 1) <= 3) user.qualificationStep = 4;
      nextStepName = 'online_interview';
    } else if (dto.step === 'online_interview') {
      if ((user.qualificationStep || 1) <= 4) user.qualificationStep = 5;
      nextStepName = 'shortlisted';
    } else if (dto.step === 'shortlisted') {
      user.qualificationStep = 5;
      user.assessmentCompleted = true;
      nextStepName = null;
    }

    user.markModified('assessmentAnswers');
    await user.save();

    return {
      message: `${dto.step} assessment recorded and verified`,
      qualificationStep: user.qualificationStep,
      completedSteps: user.completedSteps,
      assessmentCompleted: Boolean(user.assessmentCompleted),
      nextStep: nextStepName,
      isPassed: true,
    };
  }

  async getRegistrationStatus(touristId: string) {
    const user = await this.getUserOrThrow(touristId);
    const missingFields = this.getMissingFields(user);
    const progress = this.calculateProgress(user);
    const nextStep = this.getNextStepName(user, missingFields);

    return {
      registrationStatus: user.registrationStatus,
      isPaid: user.isPaid,
      progress,
      qualificationStep: user.qualificationStep || 1,
      completedSteps: user.completedSteps || [],
      assessmentCompleted: Boolean(user.assessmentCompleted),
      missingFields,
      nextStep,
    };
  }

  private getNextStepName(user: TouristDocument, missingFields: string[]): string | null {
    if (missingFields.length > 0) {
      return missingFields[0];
    }
    const qStep = user.qualificationStep || 2;
    switch (qStep) {
      case 1:
      case 2:
        return 'requirements';
      case 3:
        return 'personality_test';
      case 4:
        return 'online_interview';
      case 5:
        return user.assessmentCompleted ? null : 'shortlisted';
      default:
        return null;
    }
  }

  private getMissingFields(user: TouristDocument): string[] {
    return getMissingRegistrationFields(user);
  }

  private calculateProgress(user: TouristDocument): number {
    const total = REQUIRED_REGISTRATION_FIELDS.length + 1;
    return Math.round(((total - getMissingRegistrationFields(user).length) / total) * 100);
  }
}
