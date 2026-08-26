import { TouristDocument } from '../../modules/auth/schemas/tourist.schema';

export const REQUIRED_REGISTRATION_FIELDS = [
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
] as const;

export function getMissingRegistrationFields(user: TouristDocument): string[] {
  const missing: string[] = REQUIRED_REGISTRATION_FIELDS.filter(
    (field) => !(user as unknown as Record<string, unknown>)[field],
  );
  if (!user.socialMedia || !Object.values(user.socialMedia).some(Boolean)) {
    missing.push('socialMedia');
  }
  return missing;
}
export function syncRegistrationStatus(user: TouristDocument): void {
  const isComplete = getMissingRegistrationFields(user).length === 0;
  user.registrationStatus = isComplete ? 'complete' : 'in_progress';

  if (isComplete) {
    if (!user.completedSteps) user.completedSteps = [];
    if (!user.completedSteps.includes('registration')) {
      user.completedSteps.push('registration');
    }
    if (!user.qualificationStep || user.qualificationStep === 1) {
      user.qualificationStep = 2;
    }
  }
}
