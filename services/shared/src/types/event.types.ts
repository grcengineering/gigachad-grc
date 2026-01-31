/**
 * Event types are defined in events/event-bus.interface.ts
 * Re-export from there for convenience
 */

// Note: GrcEvent and GrcEventType are exported from ../events/event-bus.interface
// Import from there directly or from the main shared module

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  once?: boolean;
}
