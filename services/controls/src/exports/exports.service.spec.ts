import { BadRequestException } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportEntityType, ExportFormat } from './dto/export.dto';
import { Readable } from 'stream';

describe('ExportsService binary formats', () => {
  const service = new ExportsService({} as any);
  const rows = [{ id: '1', name: 'Example', score: 95 }];

  it('returns native XLSX and PDF bytes without base64 double-encoding', async () => {
    const xlsx = await service.formatRows(rows, 'xlsx');
    const pdf = await service.formatRows(rows, 'pdf');

    expect(xlsx.subarray(0, 2).toString('ascii')).toBe('PK');
    expect(pdf.subarray(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('returns UTF-8 CSV bytes', async () => {
    const csv = await service.formatRows(rows, 'csv');
    expect(csv.toString('utf8')).toContain('id,name,score');
  });

  it('rejects PPTX instead of returning a PDF with a PPTX content type', async () => {
    await expect(
      service.createExportJob('org-a', 'user-a', {
        entityType: ExportEntityType.Controls,
        format: ExportFormat.PPTX,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('does not allow export filters to override organization scope', async () => {
    const prisma: any = {
      policy: { findMany: jest.fn(async () => []) },
    };
    const scopedService = new ExportsService(prisma);
    await (scopedService as any).fetchData({
      organizationId: 'org-a',
      entityType: ExportEntityType.Policies,
      filters: { organizationId: 'org-b' },
      includeRelations: false,
    });

    expect(prisma.policy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-a' }),
      }),
    );
  });

  it('fails honestly when a completed export has no persisted file bytes', async () => {
    const prisma: any = {
      exportJob: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'export-1',
          organizationId: 'org-a',
          entityType: 'controls',
          format: 'json',
          status: 'completed',
          fileContent: null,
          createdAt: new Date(),
        }),
      },
    };
    const scopedService = new ExportsService(prisma);
    await expect(scopedService.downloadExport('org-a', 'export-1')).rejects.toThrow(
      'Completed export has no file content'
    );
  });

  it('downloads completed export bytes from object storage', async () => {
    const prisma: any = {
      exportJob: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'export-2',
          organizationId: 'org-a',
          entityType: 'controls',
          format: 'csv',
          status: 'completed',
          fileContent: null,
          storagePath: 'exports/org-a/export-2/controls.csv',
          fileName: 'controls.csv',
          createdAt: new Date(),
        }),
      },
    };
    const storage: any = {
      download: jest.fn().mockResolvedValue(Readable.from([Buffer.from('id,name\n1,Control')])),
    };
    const scopedService = new ExportsService(prisma, storage);

    const result = await scopedService.downloadExport('org-a', 'export-2');
    expect(result.content.toString()).toContain('1,Control');
    expect(storage.download).toHaveBeenCalledWith('exports/org-a/export-2/controls.csv');
  });
});
