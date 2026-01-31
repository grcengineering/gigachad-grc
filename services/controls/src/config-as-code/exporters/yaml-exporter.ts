import { Injectable } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { ConfigFormat } from '../dto/export-config.dto';
import { Exporter, ResourceData } from './exporter.interface';

@Injectable()
export class YamlExporter implements Exporter {
  export(data: ResourceData, format: ConfigFormat): string {
    if (format !== ConfigFormat.YAML) {
      throw new Error(`YAML exporter does not support format: ${format}`);
    }

    // Remove null/undefined values and convert to YAML
    const cleaned = this.cleanData(data);
    return yaml.dump(cleaned, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  }

  getMimeType(): string {
    return 'text/yaml';
  }

  getFileExtension(): string {
    return 'yaml';
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

