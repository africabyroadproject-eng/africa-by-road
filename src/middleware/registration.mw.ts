import { Request, Response, NextFunction } from 'express';
import { Tourist } from '../models/tourist.model';

export async function requireCompleteRegistration(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await Tourist.findById(req.user?.id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.registrationStatus !== 'complete') {
            res.status(403).json({
                message: 'Registration incomplete',
                registrationStatus: user.registrationStatus,
                requiredFields: getMissingFields(user)
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error checking registration status' });
    }
}

export async function requirePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await Tourist.findById(req.user?.id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (!user.isPaid) {
            res.status(403).json({
                message: 'Payment required',
                requiredPayment: 50,
                currency: 'USD'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error checking payment status' });
    }
}

function getMissingFields(user: any): string[] {
    const requiredFields = [
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
        'socialMedia'
    ];

    const missing: string[] = [];

    for (const field of requiredFields) {
        if (field === 'socialMedia') {
            if (!user.socialMedia || !Object.values(user.socialMedia).some(v => v)) {
                missing.push(field);
            }
        } else if (!user[field]) {
            missing.push(field);
        }
    }

    return missing;
}