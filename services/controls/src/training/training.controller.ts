import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DevAuthGuard } from '../auth/dev-auth.guard';
import { CurrentUser } from '../auth/decorators/require-permission.decorator';
import { TrainingService } from './training.service';
import {
  UpdateProgressDto,
  StartModuleDto,
  CompleteModuleDto,
  CreateAssignmentDto,
  BulkAssignDto,
  UpdateAssignmentDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateCustomModuleDto,
  UpdateCustomModuleDto,
} from './dto/training.dto';

interface AuthUser {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
}

@ApiTags('Training')
@ApiBearerAuth()
@UseGuards(DevAuthGuard)
@Controller('api/training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  // ==========================================
  // Progress Endpoints
  // ==========================================

  @Get('progress')
  @ApiOperation({ summary: 'Get current user training progress' })
  async getMyProgress(@CurrentUser() user: AuthUser) {
    return this.trainingService.getProgress(user.organizationId, user.userId);
  }

  @Get('progress/:moduleId')
  @ApiOperation({ summary: 'Get progress for a specific module' })
  async getModuleProgress(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
  ) {
    return this.trainingService.getModuleProgress(
      user.organizationId,
      user.userId,
      moduleId,
    );
  }

  @Post('progress/start')
  @ApiOperation({ summary: 'Start a training module' })
  async startModule(
    @CurrentUser() user: AuthUser,
    @Body() dto: StartModuleDto,
  ) {
    return this.trainingService.startModule(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put('progress/:moduleId')
  @ApiOperation({ summary: 'Update progress for a module' })
  async updateProgress(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.trainingService.updateProgress(
      user.organizationId,
      user.userId,
      moduleId,
      dto,
    );
  }

  @Post('progress/complete')
  @ApiOperation({ summary: 'Mark a training module as complete' })
  async completeModule(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteModuleDto,
  ) {
    return this.trainingService.completeModule(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get training statistics for current user' })
  async getMyStats(@CurrentUser() user: AuthUser) {
    return this.trainingService.getStats(user.organizationId, user.userId);
  }

  @Get('stats/org')
  @ApiOperation({ summary: 'Get organization-wide training statistics' })
  async getOrgStats(@CurrentUser() user: AuthUser) {
    return this.trainingService.getOrgStats(user.organizationId);
  }

  // ==========================================
  // Assignment Endpoints
  // ==========================================

  @Get('assignments')
  @ApiOperation({ summary: 'Get all assignments (admin) or current user assignments' })
  @ApiQuery({ name: 'userId', required: false })
  async getAssignments(
    @CurrentUser() user: AuthUser,
    @Query('userId') userId?: string,
  ) {
    // If not admin, only show own assignments
    const targetUserId = user.role === 'admin' ? userId : user.userId;
    return this.trainingService.getAssignments(user.organizationId, targetUserId);
  }

  @Get('assignments/me')
  @ApiOperation({ summary: 'Get current user assignments' })
  async getMyAssignments(@CurrentUser() user: AuthUser) {
    return this.trainingService.getAssignments(user.organizationId, user.userId);
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Create a training assignment' })
  async createAssignment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.trainingService.createAssignment(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Post('assignments/bulk')
  @ApiOperation({ summary: 'Bulk assign training to multiple users' })
  async bulkAssign(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkAssignDto,
  ) {
    return this.trainingService.bulkAssign(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put('assignments/:id')
  @ApiOperation({ summary: 'Update a training assignment' })
  async updateAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.trainingService.updateAssignment(
      user.organizationId,
      assignmentId,
      dto,
    );
  }

  @Delete('assignments/:id')
  @ApiOperation({ summary: 'Delete a training assignment' })
  async deleteAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') assignmentId: string,
  ) {
    return this.trainingService.deleteAssignment(
      user.organizationId,
      assignmentId,
    );
  }

  // ==========================================
  // Campaign Endpoints
  // ==========================================

  @Get('campaigns')
  @ApiOperation({ summary: 'Get all training campaigns' })
  async getCampaigns(@CurrentUser() user: AuthUser) {
    return this.trainingService.getCampaigns(user.organizationId);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get a specific training campaign' })
  async getCampaign(
    @CurrentUser() user: AuthUser,
    @Param('id') campaignId: string,
  ) {
    return this.trainingService.getCampaign(user.organizationId, campaignId);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a training campaign' })
  async createCampaign(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.trainingService.createCampaign(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update a training campaign' })
  async updateCampaign(
    @CurrentUser() user: AuthUser,
    @Param('id') campaignId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.trainingService.updateCampaign(
      user.organizationId,
      campaignId,
      dto,
    );
  }

  @Delete('campaigns/:id')
  @ApiOperation({ summary: 'Delete a training campaign' })
  async deleteCampaign(
    @CurrentUser() user: AuthUser,
    @Param('id') campaignId: string,
  ) {
    return this.trainingService.deleteCampaign(
      user.organizationId,
      campaignId,
    );
  }

  @Post('campaigns/:id/launch')
  @ApiOperation({ summary: 'Launch a campaign - create assignments for target users' })
  async launchCampaign(
    @CurrentUser() user: AuthUser,
    @Param('id') campaignId: string,
  ) {
    return this.trainingService.launchCampaign(
      user.organizationId,
      campaignId,
      user.userId,
    );
  }

  // ==========================================
  // Custom Module Endpoints
  // ==========================================

  @Get('modules')
  @ApiOperation({ summary: 'Get all modules (built-in + custom) for campaign selection' })
  async getAllModules(@CurrentUser() user: AuthUser) {
    return this.trainingService.getAllModules(user.organizationId);
  }

  @Get('modules/custom')
  @ApiOperation({ summary: 'Get all custom training modules' })
  async getCustomModules(@CurrentUser() user: AuthUser) {
    return this.trainingService.getCustomModules(user.organizationId);
  }

  @Get('modules/custom/:id')
  @ApiOperation({ summary: 'Get a specific custom training module' })
  async getCustomModule(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
  ) {
    return this.trainingService.getCustomModule(user.organizationId, moduleId);
  }

  @Post('modules/custom')
  @ApiOperation({ summary: 'Create a custom training module' })
  async createCustomModule(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCustomModuleDto,
  ) {
    return this.trainingService.createCustomModule(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Put('modules/custom/:id')
  @ApiOperation({ summary: 'Update a custom training module' })
  async updateCustomModule(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
    @Body() dto: UpdateCustomModuleDto,
  ) {
    return this.trainingService.updateCustomModule(
      user.organizationId,
      moduleId,
      dto,
    );
  }

  @Delete('modules/custom/:id')
  @ApiOperation({ summary: 'Delete a custom training module' })
  async deleteCustomModule(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
  ) {
    return this.trainingService.deleteCustomModule(
      user.organizationId,
      moduleId,
    );
  }

  @Post('modules/custom/:id/upload')
  @ApiOperation({ summary: 'Upload SCORM package for a custom module' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadScormPackage(
    @CurrentUser() user: AuthUser,
    @Param('id') moduleId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.zip')) {
      throw new BadRequestException('File must be a ZIP archive');
    }

    return this.trainingService.uploadScormPackage(
      user.organizationId,
      moduleId,
      { buffer: file.buffer, originalname: file.originalname },
    );
  }

  // ==========================================
  // User Role Targeting
  // ==========================================

  @Get('users/by-role')
  @ApiOperation({ summary: 'Get users by role for campaign targeting' })
  @ApiQuery({ name: 'roles', required: true, type: [String] })
  async getUsersByRole(
    @CurrentUser() user: AuthUser,
    @Query('roles') roles: string | string[],
  ) {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return this.trainingService.getUsersByRole(user.organizationId, roleArray);
  }

  // ==========================================
  // Quiz Endpoints
  // ==========================================

  @Get('modules/:moduleId/quiz')
  @ApiOperation({ summary: 'Get quiz questions for a module' })
  @ApiQuery({ name: 'count', required: false, type: Number, description: 'Number of questions (default: 10)' })
  async getQuizQuestions(
    @Param('moduleId') moduleId: string,
    @Query('count') count?: string,
  ) {
    const questionCount = count ? parseInt(count, 10) : 10;
    return this.trainingService.getQuizQuestions(moduleId, questionCount);
  }

  @Post('modules/:moduleId/quiz/submit')
  @ApiOperation({ summary: 'Submit quiz answers and get results' })
  async submitQuiz(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
    @Body() body: { answers: { questionId: string; selectedOption: number }[] },
  ) {
    return this.trainingService.submitQuiz(
      user.organizationId,
      user.userId,
      moduleId,
      body.answers,
    );
  }

  // ==========================================
  // Certificate Endpoints
  // ==========================================

  @Get('modules/:moduleId/certificate')
  @ApiOperation({ summary: 'Generate/get certificate for a completed module' })
  async getCertificate(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
  ) {
    return this.trainingService.generateCertificate(
      user.organizationId,
      user.userId,
      moduleId,
    );
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Get all certificates for the current user' })
  async getMyCertificates(@CurrentUser() user: AuthUser) {
    return this.trainingService.getUserCertificates(
      user.organizationId,
      user.userId,
    );
  }

  @Get('certificates/:certificateId/verify')
  @ApiOperation({ summary: 'Verify a certificate' })
  async verifyCertificate(@Param('certificateId') certificateId: string) {
    return this.trainingService.verifyCertificate(certificateId);
  }

  @Get('certificates/:certificateId/pdf')
  @ApiOperation({ summary: 'Get certificate PDF data' })
  async getCertificatePDF(@Param('certificateId') certificateId: string) {
    return this.trainingService.getCertificatePDFData(certificateId);
  }
}




