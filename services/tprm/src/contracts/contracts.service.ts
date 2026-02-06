import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { STORAGE_PROVIDER, StorageProvider } from '@gigachad-grc/shared';
import { Readable } from 'stream';
import { Prisma, ContractStatus, VendorContract, Vendor } from '@prisma/client';

// Type for contract with vendor relation
type ContractWithVendor = VendorContract & {
  vendor: Pick<Vendor, 'id' | 'name'>;
};

/**
 * SECURITY: Sanitize filename to prevent path traversal attacks
 * Removes path components, null bytes, and special characters
 * Uses iterative sanitization to prevent bypass via nested patterns
 */
function sanitizeFilename(filename: string): string {
  if (!filename) return 'file';

  let sanitized = filename;
  let previousLength: number;

  // Loop until no more changes - prevents bypass via nested/encoded patterns
  do {
    previousLength = sanitized.length;

    // Remove path components (prevents ../../../etc/passwd)
    sanitized = sanitized.replace(/^.*[\\/]/, '');

    // Remove URL-encoded dangerous sequences BEFORE other sanitization
    sanitized = sanitized
      .replace(/%252e/gi, '') // Double-encoded dot
      .replace(/%252f/gi, '') // Double-encoded forward slash
      .replace(/%255c/gi, '') // Double-encoded backslash
      .replace(/%2e/gi, '') // URL-encoded dot
      .replace(/%2f/gi, '') // URL-encoded forward slash
      .replace(/%5c/gi, '') // URL-encoded backslash
      .replace(/%00/gi, ''); // URL-encoded null byte

    // Remove null bytes (prevents null byte injection)
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/\x00/g, '');

    // Remove path traversal patterns
    sanitized = sanitized.replace(/\.{2,}/g, '.');
  } while (sanitized.length !== previousLength);

  // Replace special characters with underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length (255 is typical filesystem limit)
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, 255 - ext.length);
    sanitized = name + ext;
  }

  return sanitized || 'file';
}

// Helper to convert string to ContractStatus
function toContractStatus(
  status: string | undefined,
  defaultValue: ContractStatus = 'draft'
): ContractStatus {
  const validStatuses: ContractStatus[] = [
    'draft',
    'pending',
    'active',
    'expiring_soon',
    'expired',
    'terminated',
    'renewed',
  ];
  return validStatuses.includes(status as ContractStatus)
    ? (status as ContractStatus)
    : defaultValue;
}

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE_PROVIDER) private storage: StorageProvider
  ) {}

  async create(createContractDto: CreateContractDto, userId: string) {
    const { status, startDate, endDate, renewalDate, ...rest } = createContractDto;
    const contract = await this.prisma.vendorContract.create({
      data: {
        ...rest,
        status: toContractStatus(status),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalDate: renewalDate ? new Date(renewalDate) : undefined,
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

    const contractWithVendor = contract as ContractWithVendor;

    await this.audit.log({
      organizationId: contract.organizationId,
      userId,
      action: 'CREATE_CONTRACT',
      entityType: 'contract',
      entityId: contract.id,
      entityName: contract.title,
      description: `Created contract ${contract.title} for ${contractWithVendor.vendor.name}`,
      metadata: {
        vendorId: contract.vendorId,
        title: contract.title,
        contractType: contract.contractType,
      },
    });

    return contract;
  }

  async findAll(
    organizationId: string,
    filters?: {
      vendorId?: string;
      contractType?: string;
      status?: string;
    }
  ) {
    const where: Prisma.VendorContractWhereInput = {
      organizationId, // Required for multi-tenant data isolation
    };

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.contractType) {
      where.contractType = filters.contractType;
    }

    if (filters?.status) {
      where.status = toContractStatus(filters.status);
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

  async findOne(id: string, organizationId: string) {
    // SECURITY: Use findFirst with organizationId to prevent IDOR
    // This ensures users can only access contracts within their organization
    const contract = await this.prisma.vendorContract.findFirst({
      where: {
        id,
        organizationId, // Tenant isolation - prevents cross-organization access
      },
      include: {
        vendor: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    return contract;
  }

  async update(
    id: string,
    updateContractDto: UpdateContractDto,
    userId: string,
    organizationId: string
  ) {
    // SECURITY: Verify contract belongs to user's organization before updating
    const existingContract = await this.findOne(id, organizationId);

    const { status, startDate, endDate, renewalDate, ...rest } = updateContractDto;
    const data: Prisma.VendorContractUpdateInput = { ...rest };

    if (status) {
      data.status = toContractStatus(status);
    }

    if (startDate) {
      data.startDate = new Date(startDate);
    }

    if (endDate) {
      data.endDate = new Date(endDate);
    }

    if (renewalDate) {
      data.renewalDate = new Date(renewalDate);
    }

    const contract = await this.prisma.vendorContract.update({
      where: { id: existingContract.id },
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

    const contractWithVendor = contract as ContractWithVendor;

    await this.audit.log({
      organizationId: contract.organizationId,
      userId,
      action: 'UPDATE_CONTRACT',
      entityType: 'contract',
      entityId: contract.id,
      entityName: contract.title,
      description: `Updated contract ${contract.title} for ${contractWithVendor.vendor.name}`,
      changes: updateContractDto as unknown as Prisma.InputJsonValue,
    });

    return contract;
  }

  async remove(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify contract belongs to user's organization before deleting
    const contract = await this.findOne(id, organizationId);

    // Delete file from storage if it exists
    if (contract.storagePath) {
      try {
        await this.storage.delete(contract.storagePath);
      } catch (error) {
        this.logger.error('Error deleting contract file:', error);
      }
    }

    await this.prisma.vendorContract.delete({
      where: { id: contract.id },
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
    organizationId: string
  ) {
    // SECURITY: Verify contract belongs to user's organization before uploading
    const contract = await this.findOne(id, organizationId);

    // Delete old file if it exists
    if (contract.storagePath) {
      try {
        await this.storage.delete(contract.storagePath);
      } catch (error) {
        this.logger.error('Error deleting old contract file:', error);
      }
    }

    // SECURITY: Sanitize filename to prevent path traversal attacks
    const safeFilename = sanitizeFilename(file.originalname);

    // Upload new file
    const storagePath = `contracts/${contract.vendorId}/${id}/${safeFilename}`;
    await this.storage.upload(file.buffer, storagePath, {
      contentType: file.mimetype,
    });

    // Update contract with file info (store original filename for display, safe path for storage)
    const updatedContract = await this.prisma.vendorContract.update({
      where: { id },
      data: {
        storagePath: storagePath,
        filename: safeFilename, // Use sanitized filename
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

  async downloadDocument(id: string, organizationId: string) {
    // SECURITY: Verify contract belongs to user's organization before downloading
    const contract = await this.findOne(id, organizationId);

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

  async deleteDocument(id: string, userId: string, organizationId: string) {
    // SECURITY: Verify contract belongs to user's organization before deleting
    const contract = await this.findOne(id, organizationId);

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
