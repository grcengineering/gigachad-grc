import { ConfigFormat } from '../dto/export-config.dto';

// Resource item types for exporter
export interface ControlItem {
  id?: string;
  controlId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  tags?: string[];
  status?: string;
  [key: string]: unknown;
}

export interface FrameworkItem {
  id?: string;
  name: string;
  type?: string;
  version?: string;
  description?: string | null;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface PolicyItem {
  id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status?: string;
  version?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface RiskItem {
  id?: string;
  riskId?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  likelihood?: number | string | null;
  impact?: number | string | null;
  status?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface VendorItem {
  id?: string;
  vendorId?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface EvidenceItem {
  id?: string;
  title: string;
  [key: string]: unknown;
}

export interface ResourceData {
  controls?: ControlItem[];
  frameworks?: FrameworkItem[];
  policies?: PolicyItem[];
  risks?: RiskItem[];
  evidence?: EvidenceItem[];
  vendors?: VendorItem[];
}

export interface Exporter {
  /**
   * Export resources to the specified format
   */
  export(data: ResourceData, format: ConfigFormat): string;

  /**
   * Get the MIME type for the exported content
   */
  getMimeType(): string;

  /**
   * Get the file extension for the exported content
   */
  getFileExtension(): string;
}

