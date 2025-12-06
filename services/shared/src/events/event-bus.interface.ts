export interface EventBus {
  /**
   * Publish an event to a channel
   */
  publish<T>(channel: string, event: T): Promise<void>;

  /**
   * Subscribe to events on a channel
   */
  subscribe<T>(
    channel: string,
    handler: (event: T) => void | Promise<void>
  ): Promise<void>;

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): Promise<void>;

  /**
   * Close the connection
   */
  close(): Promise<void>;
}

// Standard GRC event types
export type GrcEventType =
  // Control events
  | 'control.created'
  | 'control.updated'
  | 'control.status_changed'
  | 'control.evidence_added'
  | 'control.test_completed'
  
  // Evidence events
  | 'evidence.uploaded'
  | 'evidence.approved'
  | 'evidence.rejected'
  | 'evidence.expired'
  | 'evidence.expiring_soon'
  
  // Framework events
  | 'assessment.created'
  | 'assessment.completed'
  | 'gap.identified'
  | 'gap.resolved'
  | 'readiness.changed'
  
  // Policy events
  | 'policy.created'
  | 'policy.submitted_for_approval'
  | 'policy.approved'
  | 'policy.rejected'
  | 'policy.review_due'
  
  // Integration events
  | 'integration.synced'
  | 'integration.error'
  | 'compliance_check.completed'
  
  // Alert events
  | 'alert.created'
  | 'alert.acknowledged'
  | 'alert.resolved';

export interface GrcEvent<T = unknown> {
  type: GrcEventType;
  timestamp: Date;
  organizationId: string;
  userId?: string;
  entityId?: string;
  entityType?: string;
  data: T;
  metadata?: Record<string, unknown>;
}

// Event channels
export const EventChannels = {
  CONTROLS: 'grc:controls',
  EVIDENCE: 'grc:evidence',
  FRAMEWORKS: 'grc:frameworks',
  POLICIES: 'grc:policies',
  INTEGRATIONS: 'grc:integrations',
  ALERTS: 'grc:alerts',
  NOTIFICATIONS: 'grc:notifications',
} as const;

// Helper function to create events
export function createEvent<T>(
  type: GrcEventType,
  organizationId: string,
  data: T,
  options?: {
    userId?: string;
    entityId?: string;
    entityType?: string;
    metadata?: Record<string, unknown>;
  }
): GrcEvent<T> {
  return {
    type,
    timestamp: new Date(),
    organizationId,
    userId: options?.userId,
    entityId: options?.entityId,
    entityType: options?.entityType,
    data,
    metadata: options?.metadata,
  };
}



