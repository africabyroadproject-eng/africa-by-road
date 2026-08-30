import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { DocumentStorageService } from './document-storage.service';

describe('ProfileService', () => {
  let profileService: ProfileService;
  let touristModel: { findById: jest.Mock };

  let documentStorageService: { upload: jest.Mock; getDocumentUrl: jest.Mock };

  beforeEach(async () => {
    touristModel = { findById: jest.fn() };
    documentStorageService = {
      upload: jest.fn(),
      getDocumentUrl: jest.fn().mockImplementation((key) => `https://signed.cloudinary.com/${key}`),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getModelToken('Tourist'), useValue: touristModel },
        { provide: DocumentStorageService, useValue: documentStorageService },
      ],
    }).compile();

    profileService = moduleRef.get(ProfileService);
  });

  it('throws NotFoundException when the tourist does not exist', async () => {
    touristModel.findById.mockResolvedValue(null);

    await expect(profileService.getRegistrationStatus('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('reports 0% progress and all fields missing for a bare-minimum profile', async () => {
    touristModel.findById.mockResolvedValue({ registrationStatus: 'pending', isPaid: false });

    const result = await profileService.getRegistrationStatus('tourist-id');

    expect(result.progress).toBe(0);
    expect(result.missingFields).toEqual([
      'firstName',
      'lastName',
      'dateOfBirth',
      'nationality',
      'state',
      'city',
      'residentialAddress',
      'governmentId',
      'proofOfAddress',
      'medicalRecords',
      'socialMedia',
    ]);
    expect(result.nextStep).toBe('firstName');
  });

  it('reports 100% progress once every required field and document is present', async () => {
    touristModel.findById.mockResolvedValue({
      registrationStatus: 'complete',
      isPaid: true,
      firstName: 'A',
      lastName: 'B',
      dateOfBirth: new Date(),
      nationality: 'Nigerian',
      state: 'Lagos',
      city: 'Lagos',
      residentialAddress: '123 Street',
      governmentId: { name: 'id.png' },
      proofOfAddress: { name: 'addr.png' },
      medicalRecords: { name: 'med.png' },
      socialMedia: { instagram: 'https://instagram.com/test' },
    });

    const result = await profileService.getRegistrationStatus('tourist-id');

    expect(result.progress).toBe(100);
    expect(result.missingFields).toEqual([]);
    expect(result.nextStep).toBe('requirements');
  });

  it('sets registrationStatus to in_progress after a personal info update', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const user: any = { registrationStatus: 'pending', save };
    touristModel.findById.mockResolvedValue(user);

    const result = await profileService.updatePersonalInfo('tourist-id', { firstName: 'Updated' });

    expect(user.firstName).toBe('Updated');
    expect(user.registrationStatus).toBe('in_progress');
    expect(save).toHaveBeenCalled();
    expect(result.registrationStatus).toBe('in_progress');
  });

  it('records requirements assessment submission and advances qualification step to 3', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const markModified = jest.fn();
    const user: any = {
      qualificationStep: 2,
      completedSteps: ['registration'],
      assessmentAnswers: {},
      save,
      markModified,
    };
    touristModel.findById.mockResolvedValue(user);

    const result = await profileService.submitAssessment('tourist-id', {
      step: 'requirements',
      completedItems: ['travel-readiness', 'vehicle-access'],
    });

    expect(user.qualificationStep).toBe(3);
    expect(user.completedSteps).toEqual(['registration', 'requirements']);
    expect(result.nextStep).toBe('personality_test');
    expect(result.isPassed).toBe(true);
    expect(save).toHaveBeenCalled();
  });

  it('returns profile with resolved document URLs for uploaded documents', async () => {
    const user: any = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      governmentId: { name: 'id.jpg', storageKey: 'id-key', resourceType: 'image', format: 'jpg' },
      proofOfAddress: { name: 'bill.pdf', storageKey: 'bill-key', resourceType: 'image', format: 'pdf' },
      medicalRecords: null,
    };
    touristModel.findById.mockResolvedValue(user);

    const result = await profileService.getProfile('tourist-id');

    expect(result.profile.governmentId).toEqual({
      name: 'id.jpg',
      url: 'https://signed.cloudinary.com/id-key',
      uploadedAt: undefined,
    });
    expect(result.profile.proofOfAddress).toEqual({
      name: 'bill.pdf',
      url: 'https://signed.cloudinary.com/bill-key',
      uploadedAt: undefined,
    });
    expect(result.profile.medicalRecords).toBeNull();
  });
});
