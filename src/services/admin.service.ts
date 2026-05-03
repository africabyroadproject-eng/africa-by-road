import bcrypt from 'bcrypt';
import { Admin } from '../models/admin.model';

interface CreateAdminDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'superadmin';
}

interface LoginCredentials {
    email: string;
    password: string;
}

class AdminService {
    public async create(data: CreateAdminDto): Promise<{ id: string; email: string; role: string }> {
        const existing = await Admin.findOne({ email: data.email.toLowerCase() });
        if (existing) {
            throw new Error('Admin already exists with this email');
        }

        const hashedPassword = await bcrypt.hash(data.password, 12);

        const admin = await Admin.create({
            email: data.email.toLowerCase(),
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            role: data.role || 'admin'
        });

        return {
            id: String(admin._id),
            email: admin.email,
            role: admin.role
        };
    }

    public async login(data: LoginCredentials): Promise<{ id: string; email: string; role: string; firstName: string }> {
        const admin = await Admin.findOne({ email: data.email.toLowerCase() });

        if (!admin) {
            throw new Error('Invalid credentials');
        }

        if (!admin.isActive) {
            throw new Error('Account is disabled');
        }

        const valid = await bcrypt.compare(data.password, admin.password);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        admin.lastLogin = new Date();
        await admin.save();

        return {
            id: String(admin._id),
            email: admin.email,
            role: admin.role,
            firstName: admin.firstName
        };
    }

    public async findById(id: string) {
        return Admin.findById(id).select('-password');
    }

    public async listAdmins() {
        return Admin.find().select('-password').lean();
    }

    public async toggleActive(adminId: string, isActive: boolean) {
        const admin = await Admin.findByIdAndUpdate(
            adminId,
            { isActive },
            { new: true }
        ).select('-password');

        return admin;
    }
}

export const adminService = new AdminService();