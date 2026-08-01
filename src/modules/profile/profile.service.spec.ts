import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { DocumentStorageService } from './document-storage.service';

describe('ProfileService', () => {
  let profileService: ProfileService;
  let touristModel: { findById: jest.Mock };

  beforeEach(async () => {
    touristModel = { findById: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: getModelToken('Tourist'), useValue: touristModel },
        { provide: DocumentStorageService, useValue: { upload: jest.fn() } },
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
    expect(result.nextStep).toBeNull();
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
});
