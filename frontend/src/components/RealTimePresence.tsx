import { useEffect } from 'react';
import { useRealTime } from '@/hooks/useWebSocket';

interface RealTimePresenceProps {
  entityType: string;
  entityId: string;
}

/**
 * Minimal presence indicator built on the existing RealTimeProvider.
 * Shows when the client is connected to real-time updates for an entity.
 * Gracefully handles the case when RealTimeProvider is not available.
 */
export function RealTimePresence({ entityType, entityId }: RealTimePresenceProps) {
  const { status, subscribeToEntity, unsubscribeFromEntity } = useRealTime();

  useEffect(() => {
    subscribeToEntity(entityType, entityId);
    return () => {
      unsubscribeFromEntity(entityType, entityId);
    };
  }, [entityType, entityId, subscribeToEntity, unsubscribeFromEntity]);

  // Don't show anything if not connected (or provider not available)
  if (status !== 'connected') {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Live updates
    </div>
  );
}
