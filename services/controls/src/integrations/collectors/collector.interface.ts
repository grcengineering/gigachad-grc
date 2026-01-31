 
/**
 * Evidence Collector Interface
 * 
 * Base interface for all evidence collectors.
 * Collectors fetch evidence from external systems like AWS, Azure, GitHub, etc.
 */

export interface CollectorConfig {
  enabled: boolean;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
  schedule?: string; // Cron expression
  lastRunAt?: Date;
  lastRunStatus?: 'success' | 'error' | 'partial';
}

export interface CollectedEvidence {
  title: string;
  description: string;
  evidenceType: string;
  category: string;
  source: string;
  sourceId: string;
  collectedAt: Date;
  data: Record<string, unknown>;
  attachments?: CollectedAttachment[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CollectedAttachment {
  filename: string;
  contentType: string;
  data: Buffer | string;
  size: number;
}

export interface CollectionResult {
  success: boolean;
  collectorName: string;
  evidenceCount: number;
  evidence: CollectedEvidence[];
  errors: string[];
  warnings: string[];
  duration: number; // milliseconds
  timestamp: Date;
}

export interface EvidenceCollector {
  /**
   * Collector name for identification
   */
  readonly name: string;

  /**
   * Human-readable display name
   */
  readonly displayName: string;

  /**
   * Description of what this collector does
   */
  readonly description: string;

  /**
   * Icon name for UI
   */
  readonly icon: string;

  /**
   * Required credentials/settings for this collector
   */
  readonly requiredCredentials: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'select';
    required: boolean;
    options?: string[]; // for select type
    description?: string;
  }[];

  /**
   * Check if the collector is properly configured and can connect
   */
  testConnection(config: CollectorConfig): Promise<{
    success: boolean;
    message: string;
  }>;

  /**
   * Collect evidence from the source
   */
  collect(
    organizationId: string,
    config: CollectorConfig
  ): Promise<CollectionResult>;

  /**
   * Get available evidence types this collector can gather
   */
  getAvailableEvidenceTypes(): Promise<{
    type: string;
    description: string;
    category: string;
  }[]>;
}

/**
 * Base class with common functionality
 */
export abstract class BaseCollector implements EvidenceCollector {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly description: string;
  abstract readonly icon: string;
  abstract readonly requiredCredentials: EvidenceCollector['requiredCredentials'];

  abstract testConnection(config: CollectorConfig): Promise<{
    success: boolean;
    message: string;
  }>;

  abstract collect(
    organizationId: string,
    config: CollectorConfig
  ): Promise<CollectionResult>;

  abstract getAvailableEvidenceTypes(): Promise<{
    type: string;
    description: string;
    category: string;
  }[]>;

  protected createResult(
    evidence: CollectedEvidence[],
    errors: string[] = [],
    warnings: string[] = [],
    startTime: Date = new Date()
  ): CollectionResult {
    return {
      success: errors.length === 0,
      collectorName: this.name,
      evidenceCount: evidence.length,
      evidence,
      errors,
      warnings,
      duration: Date.now() - startTime.getTime(),
      timestamp: new Date(),
    };
  }

  protected validateConfig(config: CollectorConfig): string[] {
    const errors: string[] = [];
    
    for (const cred of this.requiredCredentials) {
      if (cred.required && !config.credentials[cred.key]) {
        errors.push(`Missing required credential: ${cred.label}`);
      }
    }

    return errors;
  }
}

