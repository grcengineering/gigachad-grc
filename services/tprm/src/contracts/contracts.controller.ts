import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CurrentUser, UserContext } from '@gigachad-grc/shared';
import { DevAuthGuard } from '../auth/dev-auth.guard';

// Allowlist for contract document uploads. Anything outside this set is
// rejected at the interceptor layer before the service handler runs.
// Exported so it can be exercised directly in tests.
export const CONTRACT_MIME_ALLOWLIST = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];
export const CONTRACT_MAX_BYTES = 25 * 1024 * 1024;

export function contractFileFilter(
  _req: unknown,
  file: { mimetype: string },
  cb: (err: Error | null, acceptFile: boolean) => void,
): void {
  if (CONTRACT_MIME_ALLOWLIST.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
  }
}

/**
 * SECURITY: Sanitize filename for Content-Disposition header
 * Prevents header injection attacks via malicious filenames
 */
function sanitizeFilename(filename: string): string {
  return (
    filename
      // eslint-disable-next-line no-control-regex
      .replace(/[\r\n\x00-\x1f\x7f]/g, '') // Remove control chars
      .replace(/["\\/]/g, '_')
  ); // Replace problematic chars
}

@Controller('contracts')
@UseGuards(DevAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body() createContractDto: CreateContractDto, @CurrentUser() user: UserContext) {
    return this.contractsService.create(
      {
        ...createContractDto,
        organizationId: user.organizationId,
      },
      user.userId
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: UserContext,
    @Query('vendorId') vendorId?: string,
    @Query('contractType') contractType?: string,
    @Query('status') status?: string
  ) {
    return this.contractsService.findAll(user.organizationId, { vendorId, contractType, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.contractsService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto,
    @CurrentUser() user: UserContext
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.contractsService.update(id, updateContractDto, user.userId, user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.contractsService.remove(id, user.userId, user.organizationId);
  }

  @Post(':id/document')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: CONTRACT_MAX_BYTES },
      fileFilter: contractFileFilter,
    })
  )
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserContext
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.contractsService.uploadDocument(id, file, user.userId, user.organizationId);
  }

  @Get(':id/document')
  async downloadDocument(
    @Param('id') id: string,
    @CurrentUser() user: UserContext,
    @Res() res: Response
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    const { buffer, filename, mimetype } = await this.contractsService.downloadDocument(
      id,
      user.organizationId
    );

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`);
    res.send(buffer);
  }

  @Delete(':id/document')
  deleteDocument(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.contractsService.deleteDocument(id, user.userId, user.organizationId);
  }
}
