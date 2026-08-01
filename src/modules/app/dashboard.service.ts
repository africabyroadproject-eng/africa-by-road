import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tourist, TouristDocument } from '../auth/schemas/tourist.schema';

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

@Injectable()
export class DashboardService {
  constructor(@InjectModel(Tourist.name) private readonly touristModel: Model<TouristDocument>) {}

  async getDashboard(userId: string): Promise<DashboardData> {
    const tourist = await this.touristModel.findById(userId).lean();
    const hasBasicProfile = !!tourist?.firstName && !!tourist?.lastName && !!tourist?.email;

    const qualificationProgress: QualificationProgressStep[] = [
      { step: 'Registration', status: hasBasicProfile ? 'Completed' : 'Pending', order: 1 },
      { step: 'Requirements Assessment', status: 'Pending', order: 2 },
      { step: 'Personality Assessment', status: 'Pending', order: 3 },
      { step: 'Online Interview', status: 'Pending', order: 4 },
      { step: 'Shortlisted', status: 'Pending', order: 5 },
    ];

    const registrationRequirements: DashboardRequirement[] = [
      {
        id: 'complete-profile',
        title: 'Complete your profile',
        description: 'Provide your personal information to continue.',
        due: 'Immediate',
        status: hasBasicProfile ? 'Completed' : 'Required',
        actionHref: '/app/registration/profile',
      },
      {
        id: 'upload-travel-insurance',
        title: 'Upload Travel Insurance',
        description: 'All members must provide proof of travel insurance.',
        due: 'Before your first trip',
        status: 'Required',
        actionHref: '/app/registration/insurance',
      },
      {
        id: 'vehicle-information',
        title: 'Vehicle Information',
        description: 'Add details about your vehicle for road trips.',
        due: 'Before your first trip',
        status: 'Required',
        actionHref: '/app/registration/vehicle',
      },
    ];

    return {
      header: {
        title: 'EXPLORE AFRICA BY ROAD',
        subtitle: 'Join our community of road travelers exploring the beauty and diversity of Africa.',
        heroImages: [
          'https://placehold.co/1200x600/0f3460/eaeaea?text=Road+Trip+Africa',
          'https://placehold.co/1200x600/1a1a2e/eaeaea?text=Adventure+Awaits',
          'https://placehold.co/1200x600/16213e/eaeaea?text=Explore+More',
        ],
        cta: { text: 'Join Community', href: '/register' },
      },
      alerts: hasBasicProfile
        ? []
        : [
            {
              type: 'warning',
              message: 'Your registration is incomplete. Please complete all required steps to access all features.',
            },
          ],
      qualificationProgress,
      nextAction: {
        title: 'Next Step: Complete Requirements Assessment',
        description: 'Please complete all required documents and information in the Registration Requirements section below.',
        actionText: 'Start Assessment',
        actionHref: '/app/registration/requirements',
      },
      registrationRequirements,
    };
  }
}
