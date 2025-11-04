import { Tourist } from '../models/tourist.model';

export interface DashboardRequirement {
    id: string;
    title: string;
    description: string;
    due: string;
    status: 'Completed' | 'Required';
    actionHref: string;
}

export interface QualificationProgressStep {
    step: string;
    status: 'Completed' | 'Pending';
    order: number;
}

export interface DashboardData {
    header: {
        title: string;
        subtitle: string;
        heroImages: string[];
        cta: { text: string; href: string };
    };
    alerts: Array<{ type: 'info' | 'warning' | 'success'; message: string }>;
    qualificationProgress: QualificationProgressStep[];
    nextAction: { title: string; description: string; actionText: string; actionHref: string };
    registrationRequirements: DashboardRequirement[];
}

class DashboardService {
    public async getDashboard(userId: string): Promise<DashboardData> {
        const tourist = await Tourist.findById(userId).lean();

        // Determine basic completeness from profile fields
        const hasBasicProfile =
            !!tourist?.firstName && !!tourist?.lastName && !!tourist?.email;

        const registrationStatus: QualificationProgressStep[] = [
            {
                step: 'Registration',
                status: hasBasicProfile ? 'Completed' : 'Pending',
                order: 1
            },
            {
                step: 'Requirements Assessment',
                status: 'Pending',
                order: 2
            },
            {
                step: 'Personality Assessment',
                status: 'Pending',
                order: 3
            },
            {
                step: 'Online Interview',
                status: 'Pending',
                order: 4
            },
            {
                step: 'Shortlisted',
                status: 'Pending',
                order: 5
            }
        ];

        const registrationRequirements: DashboardRequirement[] = [
            {
                id: 'complete-profile',
                title: 'Complete your profile',
                description: 'Provide your personal information to continue.',
                due: 'Immediate',
                status: hasBasicProfile ? 'Completed' : 'Required',
                actionHref: '/app/registration/profile'
            },
            {
                id: 'upload-travel-insurance',
                title: 'Upload Travel Insurance',
                description: 'All members must provide proof of travel insurance.',
                due: 'Before your first trip',
                status: 'Required',
                actionHref: '/app/registration/insurance'
            },
            {
                id: 'vehicle-information',
                title: 'Vehicle Information',
                description: 'Add details about your vehicle for road trips.',
                due: 'Before your first trip',
                status: 'Required',
                actionHref: '/app/registration/vehicle'
            }
        ];

        return {
            header: {
                title: 'EXPLORE AFRICA BY ROAD',
                subtitle:
                    'Join our community of road travelers exploring the beauty and diversity of Africa.',
                heroImages: [
                    'https://example.com/images/algeria-martyrs-memorial.jpg',
                    'https://example.com/images/voortrekker-monument-night.jpg',
                    'https://example.com/images/voortrekker-monument-day.jpg'
                ],
                cta: { text: 'Join Community', href: '/register' }
            },
            alerts: hasBasicProfile
                ? []
                : [
                      {
                          type: 'warning',
                          message:
                              'Your registration is incomplete. Please complete all required steps to access all features.'
                      }
                  ],
            qualificationProgress: registrationStatus,
            nextAction: {
                title: 'Next Step: Complete Requirements Assessment',
                description:
                    'Please complete all required documents and information in the Registration Requirements section below.',
                actionText: 'Start Assessment',
                actionHref: '/app/registration/requirements'
            },
            registrationRequirements
        };
    }
}

export const dashboardService = new DashboardService();