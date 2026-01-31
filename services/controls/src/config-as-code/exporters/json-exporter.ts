import { Injectable } from '@nestjs/common';
import { ConfigFormat } from '../dto/export-config.dto';
import { Exporter, ResourceData } from './exporter.interface';

@Injectable()
export class JsonExporter implements Exporter {
  export(data: ResourceData, format: ConfigFormat): string {
    if (format !== ConfigFormat.JSON) {
      throw new Error(`JSON exporter does not support format: ${format}`);
    }

    // Remove null/undefined values and format JSON
    const cleaned = this.cleanData(data);
    return JSON.stringify(cleaned, null, 2);
  }

  getMimeType(): string {
    return 'application/json';
  }

  getFileExtension(): string {
    return 'json';
  }

  private cleanData(data: ResourceData): ResourceData {
    const cleaned: ResourceData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (cleaned as any)[key] = value.map(item => 
            this.removeNullFields(item)
          );
        }
      }
    }

    return cleaned;
  }

  private removeNullFields(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeNullFields(item));
    }

    if (typeof obj === 'object') {
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (value !== null && value !== undefined) {
          // Skip internal fields
          if (key.startsWith('_') || key === 'deletedAt' || key === 'deletedBy') {
            continue;
          }
          cleaned[key] = this.removeNullFields(value);
        }
      }
      return cleaned;
    }

    return obj;
  }
}

