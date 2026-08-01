import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Admin, AdminDocument } from './schemas/admin.schema';

interface CreateAdminDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'superadmin';
}

interface AdminLoginDto {
  email: string;
  password: string;
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

@Injectable()
export class AdminService {
  constructor(@InjectModel(Admin.name) private readonly adminModel: Model<AdminDocument>) {}

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

  async login(data: AdminLoginDto): Promise<{ id: string; email: string; role: string; firstName: string }> {
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

    return { id: String(admin._id), email: admin.email, role: admin.role, firstName: admin.firstName };
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
