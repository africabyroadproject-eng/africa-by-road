import { BadRequestException, Body, Controller, Get, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TokenPayload } from '../../common/interfaces/token-payload.interface';
import { PersonalInfoDto } from './dto/personal-info.dto';
import { SocialMediaDto } from './dto/social-media.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get complete user profile' })
  getProfile(@CurrentUser() user: TokenPayload) {
    return this.profileService.getProfile(user.id);
  }

  @Put('personal')
  @ApiOperation({ summary: 'Update personal details' })
  updatePersonalInfo(@CurrentUser() user: TokenPayload, @Body() dto: PersonalInfoDto) {
    return this.profileService.updatePersonalInfo(user.id, dto);
  }

  @Put('social')
  @ApiOperation({ summary: 'Update social media handles' })
  updateSocialMedia(@CurrentUser() user: TokenPayload, @Body() dto: SocialMediaDto) {
    return this.profileService.updateSocialMedia(user.id, dto);
  }

  @Put('documents')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @ApiOperation({ summary: 'Upload governmentId/proofOfAddress/medicalRecords' })
  uploadDocuments(@CurrentUser() user: TokenPayload, @Body() dto: UploadDocumentDto, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Document file is required');
    return this.profileService.uploadDocument(user.id, dto, file);
  }

  @Get('status')
  @ApiOperation({ summary: 'Check registration completion % and missing fields' })
  getRegistrationStatus(@CurrentUser() user: TokenPayload) {
    return this.profileService.getRegistrationStatus(user.id);
  }
}
