import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Admin, AdminDocument } from './schemas/admin.schema';

interface CreateAdminDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'superadmin' | 'user_manager' | 'contestant_manager' | 'voting_manager' | 'trivia_manager' | 'prize_manager';
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new BadRequestException('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new BadRequestException('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new BadRequestException('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    throw new BadRequestException('Password must contain at least one number');
  }
}

export interface AdminAuthResult {
  token: string;
  admin: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

@Injectable()
export class AdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateToken(admin: { id: string; email: string; role: string }): string {
    return this.jwtService.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      {
        secret: this.configService.getOrThrow<string>('auth.jwtSecret'),
        expiresIn: (this.configService.get<string>('auth.jwtExpiresIn') || '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        algorithm: 'HS256',
        issuer: this.configService.getOrThrow<string>('auth.jwtIssuer'),
        audience: this.configService.getOrThrow<string>('auth.jwtAudience'),
      },
    );
  }

  async create(data: CreateAdminDto): Promise<{ id: string; email: string; role: string }> {
    const existing = await this.adminModel.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('Admin already exists with this email');
    }

    validatePassword(data.password);
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const admin = await this.adminModel.create({
      email: data.email.toLowerCase(),
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'admin',
    });

    return { id: String(admin._id), email: admin.email, role: admin.role };
  }

  async login(data: AdminLoginDto): Promise<AdminAuthResult> {
    const admin = await this.adminModel.findOne({ email: data.email.toLowerCase() }).select('+password');
    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!admin.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    const valid = await bcrypt.compare(data.password, admin.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    admin.lastLogin = new Date();
    await admin.save();

    const adminInfo = {
      id: String(admin._id),
      email: admin.email,
      role: admin.role,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };

    const token = this.generateToken(adminInfo);

    return {
      token,
      admin: adminInfo,
    };
  }

  async seedSuperadmin(): Promise<{ seeded: boolean; message: string }> {
    const email = (this.configService.get<string>('ADMIN_EMAIL') || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = (this.configService.get<string>('ADMIN_PASSWORD') || process.env.ADMIN_PASSWORD || '').trim();

    if (!email || !password) {
      return { seeded: false, message: 'ADMIN_EMAIL or ADMIN_PASSWORD environment variable not set' };
    }

    const existing = await this.adminModel.findOne({ email });
    if (existing) {
      return { seeded: false, message: `Admin with email "${email}" already exists` };
    }

    validatePassword(password);
    const hashedPassword = await bcrypt.hash(password, 12);

    await this.adminModel.create({
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'superadmin',
      isActive: true,
    });

    this.logger.log(`Superadmin account (${email}) seeded successfully.`);
    return { seeded: true, message: `Superadmin account (${email}) created successfully` };
  }

  async onApplicationBootstrap() {
    try {
      await this.seedSuperadmin();
    } catch (err) {
      this.logger.error(`Auto-seeding superadmin failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async findById(id: string) {
    return this.adminModel.findById(id).select('-password');
  }

  async listAdmins() {
    return this.adminModel.find().select('-password').lean();
  }

  async toggleActive(adminId: string, isActive: boolean, callerRole?: string) {
    if (callerRole !== 'superadmin') {
      throw new ForbiddenException('Only superadmins can toggle admin active status');
    }

    return this.adminModel.findByIdAndUpdate(adminId, { isActive }, { new: true }).select('-password');
  }
}
