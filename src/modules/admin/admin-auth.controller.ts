import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { getCookieConfig } from '../../config/cookie.config';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin — Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminService: AdminService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Admin login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account disabled' })
  async login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.adminService.login(dto);
    res.cookie('adminToken', result.token, getCookieConfig(this.configService));
    return {
      message: 'Admin login successful',
      token: result.token,
      admin: result.admin,
    };
  }
}
