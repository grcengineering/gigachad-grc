/**
 * Watermark Service
 *
 * Adds watermarks to PDFs and images for secure document sharing.
 * Used primarily for the auditor portal to track document access.
 */

import PDFKitDocument from 'pdfkit';
import { Writable } from 'stream';

const {
  PDFDocument: PDFLibDocument,
  StandardFonts,
  degrees,
  rgb,
} = require('../../vendor/pdf-lib-1.17.1.min.cjs') as {
  PDFDocument: { load(input: Uint8Array): Promise<any> };
  StandardFonts: { Helvetica: string };
  degrees(angle: number): any;
  rgb(red: number, green: number, blue: number): any;
};
type RGB = ReturnType<typeof rgb>;

export interface WatermarkOptions {
  text: string;
  fontSize?: number;
  opacity?: number;
  color?: string;
  rotation?: number;
  position?: 'center' | 'diagonal' | 'footer' | 'header';
  includeTimestamp?: boolean;
  includeIpAddress?: string;
}

export interface WatermarkResult {
  buffer: Buffer;
  contentType: string;
}

/**
 * Add a visible watermark and access metadata to every page while preserving
 * the original PDF content and page count.
 */
export async function watermarkPdf(
  pdfBuffer: Buffer,
  options: WatermarkOptions
): Promise<WatermarkResult> {
  const document = await PDFLibDocument.load(pdfBuffer);
  const font = await document.embedFont(StandardFonts.Helvetica);
  const {
    fontSize = 48,
    opacity = 0.15,
    color = '#000000',
    rotation = -45,
    position = 'diagonal',
    includeTimestamp = true,
    includeIpAddress,
  } = options;
  const watermarkText = toPdfText(options.text);
  const metadata = [
    includeTimestamp ? `Accessed: ${new Date().toISOString()}` : '',
    includeIpAddress ? `IP: ${includeIpAddress}` : '',
  ]
    .filter(Boolean)
    .join(' | ');
  const pdfColor = parsePdfColor(color);

  for (const page of document.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    const common = {
      size: fontSize,
      font,
      color: pdfColor,
      opacity: clamp(opacity, 0, 1),
    };

    if (position === 'header' || position === 'footer') {
      const edgeSize = Math.min(fontSize, 14);
      page.drawText(watermarkText, {
        ...common,
        size: edgeSize,
        x: 36,
        y: position === 'header' ? height - edgeSize - 24 : 24,
        opacity: Math.max(common.opacity, 0.35),
      });
    } else {
      page.drawText(watermarkText, {
        ...common,
        x: Math.max(24, (width - textWidth) / 2),
        y: height / 2,
        rotate: position === 'diagonal' ? degrees(rotation) : undefined,
      });
    }

    if (metadata) {
      page.drawText(toPdfText(metadata), {
        size: 8,
        font,
        color: pdfColor,
        opacity: Math.max(clamp(opacity, 0, 1), 0.35),
        x: 36,
        y: 10,
      });
    }
  }

  const bytes = await document.save();
  return {
    buffer: Buffer.from(bytes),
    contentType: 'application/pdf',
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parsePdfColor(value: string): RGB {
  const normalized = value.trim().replace(/^#/, '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => character.repeat(2))
          .join('')
      : normalized;
  if (!/^[0-9a-f]{6}$/i.test(expanded)) return rgb(0, 0, 0);
  return rgb(
    parseInt(expanded.slice(0, 2), 16) / 255,
    parseInt(expanded.slice(2, 4), 16) / 255,
    parseInt(expanded.slice(4, 6), 16) / 255
  );
}

function toPdfText(value: string): string {
  return value.replace(/[^\x20-\x7e\xa0-\xff]/g, '?');
}

/**
 * Add a watermark page to a PDF document
 */
function addWatermarkPage(doc: PDFKit.PDFDocument, options: WatermarkOptions): void {
  const {
    text,
    fontSize = 48,
    opacity = 0.15,
    color = '#000000',
    rotation = -45,
    position = 'diagonal',
    includeTimestamp = true,
    includeIpAddress,
  } = options;

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Set font and color
  doc.fontSize(fontSize);
  doc.fillColor(color);
  doc.fillOpacity(opacity);

  if (position === 'diagonal') {
    // Diagonal watermark across the page
    doc.save();
    doc.translate(pageWidth / 2, pageHeight / 2);
    doc.rotate(rotation);
    doc.text(text, -200, -20, { width: 400, align: 'center' });
    doc.restore();
  } else if (position === 'center') {
    doc.text(text, 0, pageHeight / 2 - fontSize / 2, { width: pageWidth, align: 'center' });
  } else if (position === 'header') {
    doc.fillOpacity(0.5);
    doc.fontSize(10);
    doc.text(text, 50, 30);
  } else if (position === 'footer') {
    doc.fillOpacity(0.5);
    doc.fontSize(10);
    doc.text(text, 50, pageHeight - 50);
  }

  // Add timestamp and IP if requested
  doc.fillOpacity(0.3);
  doc.fontSize(8);

  if (includeTimestamp) {
    doc.text(`Generated: ${new Date().toISOString()}`, 50, pageHeight - 30);
  }

  if (includeIpAddress) {
    doc.text(`Access IP: ${includeIpAddress}`, 50, pageHeight - 20);
  }

  doc.fillOpacity(1); // Reset opacity
}

/**
 * Generate watermark text from auditor info
 */
export function generateWatermarkText(
  auditorName: string,
  auditorEmail: string,
  auditName?: string
): string {
  const parts = [auditorName, auditorEmail];
  if (auditName) {
    parts.push(auditName);
  }
  return parts.join(' | ');
}

/**
 * Create a simple watermarked wrapper for any file
 * Returns a PDF with watermark info and a note about the original file
 */
export async function createWatermarkCoverPage(
  originalFileName: string,
  options: WatermarkOptions
): Promise<Buffer> {
  const doc = new PDFKitDocument({ size: 'A4' });
  const chunks: Buffer[] = [];

  const writeStream = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      resolve(Buffer.concat(chunks));
    });

    writeStream.on('error', reject);
    doc.pipe(writeStream);

    // Header
    doc.fontSize(24).fillColor('#1a1a2e');
    doc.text('Document Access Record', 50, 50);

    // Divider
    doc.moveTo(50, 90).lineTo(550, 90).stroke('#e0e0e0');

    // File info
    doc.fontSize(12).fillColor('#333333');
    doc.text('Original File:', 50, 110);
    doc.fontSize(14).fillColor('#1a1a2e');
    doc.text(originalFileName, 50, 130);

    // Watermark info
    doc.fontSize(12).fillColor('#333333');
    doc.text('Accessed By:', 50, 170);
    doc.fontSize(14).fillColor('#1a1a2e');
    doc.text(options.text, 50, 190);

    if (options.includeTimestamp) {
      doc.fontSize(12).fillColor('#333333');
      doc.text('Access Time:', 50, 230);
      doc.fontSize(14).fillColor('#1a1a2e');
      doc.text(new Date().toISOString(), 50, 250);
    }

    if (options.includeIpAddress) {
      doc.fontSize(12).fillColor('#333333');
      doc.text('IP Address:', 50, 290);
      doc.fontSize(14).fillColor('#1a1a2e');
      doc.text(options.includeIpAddress, 50, 310);
    }

    // Warning box
    doc.rect(50, 370, 500, 80).fill('#fff3cd');
    doc.fillColor('#856404');
    doc.fontSize(12);
    doc.text('CONFIDENTIAL', 70, 385, { continued: true });
    doc.fontSize(10);
    doc.text('', 70, 405);
    doc.text(
      'This document contains confidential information and is intended solely for the use of the individual or entity to whom it is addressed. Unauthorized review, use, disclosure, or distribution is prohibited.',
      70,
      405,
      { width: 460 }
    );

    // Add diagonal watermark
    addWatermarkPage(doc, { ...options, position: 'diagonal' });

    doc.end();
  });
}

/**
 * Check if a file type supports direct watermarking
 */
export function supportsDirectWatermark(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Get recommended watermark options based on context
 */
export function getDefaultWatermarkOptions(
  auditorName: string,
  auditorEmail: string,
  ipAddress?: string
): WatermarkOptions {
  return {
    text: generateWatermarkText(auditorName, auditorEmail),
    fontSize: 48,
    opacity: 0.15,
    color: '#666666',
    rotation: -45,
    position: 'diagonal',
    includeTimestamp: true,
    includeIpAddress: ipAddress,
  };
}
