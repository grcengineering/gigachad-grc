import {
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

@Controller('contracts')
@UseGuards(DevAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(
    @Body() createContractDto: CreateContractDto,
    @CurrentUser() user: UserContext,
  ) {
    return this.contractsService.create(createContractDto, user.userId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UserContext,
    @Query('vendorId') vendorId?: string,
    @Query('contractType') contractType?: string,
    @Query('status') status?: string,
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
    @CurrentUser() user: UserContext,
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
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserContext,
  ) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.contractsService.uploadDocument(id, file, user.userId, user.organizationId);
  }

  @Get(':id/document')
  async downloadDocument(@Param('id') id: string, @CurrentUser() user: UserContext, @Res() res: Response) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    const { buffer, filename, mimetype } = await this.contractsService.downloadDocument(id, user.organizationId);

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Delete(':id/document')
  deleteDocument(@Param('id') id: string, @CurrentUser() user: UserContext) {
    // SECURITY: Pass organizationId to ensure tenant isolation
    return this.contractsService.deleteDocument(id, user.userId, user.organizationId);
  }
}
