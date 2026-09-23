import { BadRequestException } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportEntityType, ExportFormat } from './dto/export.dto';

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
});
