import { watermarkPdf } from './watermark.service';

const { PDFDocument, StandardFonts } = require('../../vendor/pdf-lib-1.17.1.min.cjs') as {
  PDFDocument: {
    create(): Promise<any>;
    load(input: Uint8Array): Promise<any>;
  };
  StandardFonts: { Helvetica: string };
};

describe('watermarkPdf', () => {
  it('preserves every original page while applying the watermark', async () => {
    const source = await PDFDocument.create();
    const font = await source.embedFont(StandardFonts.Helvetica);
    const first = source.addPage([400, 300]);
    first.drawText('Original page one', { x: 40, y: 240, font });
    const second = source.addPage([500, 400]);
    second.drawText('Original page two', { x: 40, y: 340, font });
    const original = Buffer.from(await source.save());

    const result = await watermarkPdf(original, {
      text: 'Auditor | auditor@example.com',
      includeTimestamp: true,
      includeIpAddress: '192.0.2.1',
    });

    const watermarked = await PDFDocument.load(result.buffer);
    expect(result.contentType).toBe('application/pdf');
    expect(watermarked.getPageCount()).toBe(2);
    expect(result.buffer.equals(original)).toBe(false);
    expect(result.buffer.length).toBeGreaterThan(original.length);
  });

  it('rejects input that is not a valid PDF', async () => {
    await expect(watermarkPdf(Buffer.from('not a pdf'), { text: 'Auditor' })).rejects.toThrow();
  });
});
