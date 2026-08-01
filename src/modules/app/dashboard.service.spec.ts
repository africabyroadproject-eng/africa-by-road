import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let touristModel: { findById: jest.Mock };

  beforeEach(async () => {
    touristModel = { findById: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [DashboardService, { provide: getModelToken('Tourist'), useValue: touristModel }],
    }).compile();

    dashboardService = moduleRef.get(DashboardService);
  });

  it('flags an incomplete profile with a warning alert and a pending Registration step', async () => {
    touristModel.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ firstName: '', lastName: '', email: 'a@b.com' }) });

    const result = await dashboardService.getDashboard('tourist-id');

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].type).toBe('warning');
    expect(result.qualificationProgress[0]).toEqual({ step: 'Registration', status: 'Pending', order: 1 });
  });

  it('clears alerts and marks Registration complete once basic profile fields are filled', async () => {
    touristModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ firstName: 'A', lastName: 'B', email: 'a@b.com' }),
    });

    const result = await dashboardService.getDashboard('tourist-id');

    expect(result.alerts).toHaveLength(0);
    expect(result.qualificationProgress[0]).toEqual({ step: 'Registration', status: 'Completed', order: 1 });
    expect(result.registrationRequirements[0].status).toBe('Completed');
  });
});
