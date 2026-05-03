import { Request, Response } from 'express';
import { Tourist } from '../models/tourist.model';
import { PersonalInfoDto, SocialMediaDto, DocumentDto } from '../interfaces/auth.interface';

export class ProfileController {
    public async getProfile(req: Request, res: Response): Promise<void> {
        try {
            const user = await Tourist.findById(req.user?.id);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            res.status(200).json({
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
                    updatedAt: user.updatedAt
                }
            });
        } catch (error) {
            res.status(500).json({ message: 'Failed to retrieve profile' });
        }
    }

    public async updatePersonalInfo(req: Request<{}, {}, PersonalInfoDto>, res: Response): Promise<void> {
        try {
            const user = await Tourist.findById(req.user?.id);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            const { firstName, middleName, lastName, dateOfBirth, nationality, state, city, residentialAddress, phoneNumber } = req.body;

            if (firstName !== undefined) user.firstName = firstName;
            if (middleName !== undefined) user.middleName = middleName;
            if (lastName !== undefined) user.lastName = lastName;
            if (dateOfBirth !== undefined) user.dateOfBirth = new Date(dateOfBirth);
            if (nationality !== undefined) user.nationality = nationality;
            if (state !== undefined) user.state = state;
            if (city !== undefined) user.city = city;
            if (residentialAddress !== undefined) user.residentialAddress = residentialAddress;
            if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

            user.registrationStatus = 'in_progress';
            await user.save();

            res.status(200).json({ message: 'Personal info updated', registrationStatus: user.registrationStatus });
        } catch (error) {
            res.status(500).json({ message: 'Failed to update personal info' });
        }
    }

    public async updateSocialMedia(req: Request<{}, {}, SocialMediaDto>, res: Response): Promise<void> {
        try {
            const user = await Tourist.findById(req.user?.id);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            user.socialMedia = {
                instagram: req.body.instagram,
                facebook: req.body.facebook,
                twitter: req.body.twitter,
                tiktok: req.body.tiktok,
                youtube: req.body.youtube
            };

            await user.save();

            res.status(200).json({ message: 'Social media updated' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to update social media' });
        }
    }

    public async uploadDocuments(req: Request<{}, {}, DocumentDto>, res: Response): Promise<void> {
        try {
            const { type, name, url } = req.body;
            const user = await Tourist.findById(req.user?.id);

            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            const docData = { name, url, uploadedAt: new Date() };

            if (type === 'governmentId') {
                user.governmentId = docData;
            } else if (type === 'proofOfAddress') {
                user.proofOfAddress = docData;
            } else if (type === 'medicalRecords') {
                user.medicalRecords = docData;
            } else {
                res.status(400).json({ message: 'Invalid document type' });
                return;
            }

            await user.save();

            res.status(200).json({ message: 'Document uploaded', documentType: type });
        } catch (error) {
            res.status(500).json({ message: 'Failed to upload document' });
        }
    }

    public async getRegistrationStatus(req: Request, res: Response): Promise<void> {
        try {
            const user = await Tourist.findById(req.user?.id);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            const missingFields = this.getMissingFields(user);
            const progress = this.calculateProgress(user);

            res.status(200).json({
                registrationStatus: user.registrationStatus,
                isPaid: user.isPaid,
                progress,
                missingFields,
                nextStep: missingFields.length > 0 ? missingFields[0] : null
            });
        } catch (error) {
            res.status(500).json({ message: 'Failed to get registration status' });
        }
    }

    private getMissingFields(user: any): string[] {
        const required = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'state', 'city', 'residentialAddress'];
        const documents = ['governmentId', 'proofOfAddress', 'medicalRecords'];
        const missing: string[] = [];

        for (const field of required) {
            if (!user[field]) missing.push(field);
        }

        for (const doc of documents) {
            if (!user[doc]) missing.push(doc);
        }

        return missing;
    }

    private calculateProgress(user: any): number {
        const fields = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'state', 'city', 'residentialAddress'];
        const documents = ['governmentId', 'proofOfAddress', 'medicalRecords'];

        let filled = 0;
        for (const field of fields) {
            if (user[field]) filled++;
        }
        for (const doc of documents) {
            if (user[doc]) filled++;
        }

        return Math.round((filled / (fields.length + documents.length)) * 100);
    }
}