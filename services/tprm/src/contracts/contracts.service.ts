import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
import { Readable } from 'stream';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider,
  ) {}

  async create(createContractDto: CreateContractDto, userId: string) {
    const contract = await this.prisma.vendorContract.create({
      data: {
        ...createContractDto,
        status: (createContractDto.status || 'draft') as any,
        startDate: new Date(createContractDto.startDate),
        endDate: new Date(createContractDto.endDate),
        renewalDate: createContractDto.renewalDate
          ? new Date(createContractDto.renewalDate)
          : undefined,
        createdBy: userId,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: contract.organizationId,
      userId,
      action: 'CREATE_CONTRACT',
      entityType: 'contract',
      entityId: contract.id,
      entityName: contract.title,
      description: `Created contract ${contract.title} for ${(contract).vendor.name}`,
      metadata: {
        vendorId: contract.vendorId,
        title: contract.title,
        contractType: contract.contractType,
      },
    });

    return contract;
  }

  async findAll(filters?: {
    vendorId?: string;
    contractType?: string;
    status?: string;
  }) {
    const where: any = {};

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.contractType) {
      where.contractType = filters.contractType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.vendorContract.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const contract = await this.prisma.vendorContract.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    return contract;
  }

  async update(id: string, updateContractDto: UpdateContractDto, userId: string) {
    const data: any = { ...updateContractDto };

    if (updateContractDto.startDate) {
      data.startDate = new Date(updateContractDto.startDate);
    }

    if (updateContractDto.endDate) {
      data.endDate = new Date(updateContractDto.endDate);
    }

    if (updateContractDto.renewalDate) {
      data.renewalDate = new Date(updateContractDto.renewalDate);
    }

    const contract = await this.prisma.vendorContract.update({
      where: { id },
      data,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: contract.organizationId,
      userId,
      action: 'UPDATE_CONTRACT',
      entityType: 'contract',
      entityId: contract.id,
      entityName: contract.title,
      description: `Updated contract ${contract.title} for ${contract.vendor.name}`,
      changes: updateContractDto,
    });

    return contract;
  }

  async remove(id: string, userId: string) {
    const contract = await this.prisma.vendorContract.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    // Delete file from storage if it exists
    if (contract.storagePath) {
      try {
        await this.storage.delete(contract.storagePath);
      } catch (error) {
        console.error('Error deleting contract file:', error);
      }
    }

    await this.prisma.vendorContract.delete({
      where: { id },
    });

    await this.audit.log({
      organizationId: contract.organizationId,
      userId,
      action: 'DELETE_CONTRACT',
      entityType: 'contract',
      entityId: contract.id,
      entityName: contract.title,
      description: `Deleted contract ${contract.title} for ${contract.vendor.name}`,
      metadata: {
        vendorId: contract.vendorId,
        title: contract.title,
      },
    });

    return contract;
  }

  async uploadDocument(
    id: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const contract = await this.findOne(id);

    // Delete old file if it exists
    if (contract.storagePath) {
      try {
        await this.storage.delete(contract.storagePath);
      } catch (error) {
        console.error('Error deleting old contract file:', error);
      }
    }

    // Upload new file
    const storagePath = `contracts/${contract.vendorId}/${id}/${file.originalname}`;
    await this.storage.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
    });

    // Update contract with file info
    const updatedContract = await this.prisma.vendorContract.update({
      where: { id },
      data: {
        storagePath: storagePath,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: updatedContract.organizationId,
      userId,
      action: 'UPLOAD_CONTRACT_DOCUMENT',
      entityType: 'contract',
      entityId: id,
      entityName: updatedContract.title,
      description: `Uploaded document ${file.originalname} to contract ${updatedContract.title}`,
      metadata: {
        fileName: file.originalname,
        fileSize: file.size,
      },
    });

    return updatedContract;
  }

  async downloadDocument(id: string) {
    const contract = await this.findOne(id);

    if (!contract.storagePath) {
      throw new NotFoundException(`Contract ${id} has no uploaded document`);
    }

    const stream = await this.storage.download(contract.storagePath);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream as Readable) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
      buffer,
      filename: contract.filename || 'contract.pdf',
      mimetype: contract.mimeType || 'application/pdf',
    };
  }

  async deleteDocument(id: string, userId: string) {
    const contract = await this.findOne(id);

    if (!contract.storagePath) {
      throw new NotFoundException(`Contract ${id} has no uploaded document`);
    }

    await this.storage.delete(contract.storagePath);

    const updatedContract = await this.prisma.vendorContract.update({
      where: { id },
      data: {
        storagePath: null,
        filename: null,
        mimeType: null,
        size: null,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await this.audit.log({
      organizationId: updatedContract.organizationId,
      userId,
      action: 'DELETE_CONTRACT_DOCUMENT',
      entityType: 'contract',
      entityId: id,
      entityName: updatedContract.title,
      description: `Deleted document ${contract.filename} from contract ${updatedContract.title}`,
      metadata: {
        fileName: contract.filename,
      },
    });

    return updatedContract;
  }
}
