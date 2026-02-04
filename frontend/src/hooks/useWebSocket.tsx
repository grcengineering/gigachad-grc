import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// ============================================
// WebSocket Status Types
// ============================================

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// ============================================
// RealTime Context
// ============================================

interface RealTimeContextValue {
  status: WebSocketStatus;
  send: (type: string, payload: unknown) => void;
  subscribeToEntity: (entityType: string, entityId: string) => void;
  unsubscribeFromEntity: (entityType: string, entityId: string) => void;
}

const RealTimeContext = createContext<RealTimeContextValue | null>(null);

interface RealTimeProviderProps {
  children: ReactNode;
  wsUrl?: string;
}

// Exponential backoff configuration
const WS_RECONNECT_CONFIG = {
  minDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds maximum
  multiplier: 2, // Double delay each attempt
  jitter: 0.1, // 10% random jitter
};

export function RealTimeProvider({ children, wsUrl }: RealTimeProviderProps) {
  const queryClient = useQueryClient();

  // Get WebSocket URL from environment or prop
  const url = wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptRef = useRef<number>(0);

  /**
   * Calculate reconnect delay with exponential backoff and jitter
   */
  const getReconnectDelay = useCallback(() => {
    const { minDelay, maxDelay, multiplier, jitter } = WS_RECONNECT_CONFIG;
    const attempt = reconnectAttemptRef.current;

    // Calculate base delay with exponential backoff
    const baseDelay = Math.min(minDelay * Math.pow(multiplier, attempt), maxDelay);

    // Add random jitter to prevent thundering herd
    const jitterAmount = baseDelay * jitter * (Math.random() * 2 - 1);

    return Math.floor(baseDelay + jitterAmount);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        // Reset reconnect attempts on successful connection
        reconnectAttemptRef.current = 0;
        // Re-subscribe to all entities
        subscriptionsRef.current.forEach((sub) => {
          const [entityType, entityId] = sub.split(':');
          ws.send(JSON.stringify({ type: 'subscribe', payload: { entityType, entityId } }));
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        // Exponential backoff reconnection
        const delay = getReconnectDelay();
        reconnectAttemptRef.current++;
        if (import.meta.env.DEV) {
          console.debug(
            `WebSocket closed. Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`
          );
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        setStatus('error');
      };
    } catch (e) {
      console.error('Failed to connect to WebSocket:', e);
      setStatus('error');
    }
  }, [url, getReconnectDelay]);

  const handleMessage = useCallback(
    (message: { type: string; payload: unknown }) => {
      switch (message.type) {
        case 'entity.updated': {
          // Invalidate relevant queries
          const { entityType, entityId } = message.payload as {
            entityType: string;
            entityId: string;
          };
          queryClient.invalidateQueries({ queryKey: [entityType, entityId] });
          queryClient.invalidateQueries({ queryKey: [entityType + 's'] }); // Plural for list queries
          break;
        }

        case 'notification': {
          const { body } = message.payload as { title: string; body: string };
          toast(body, { icon: '🔔' });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          break;
        }

        case 'sync.complete':
          toast.success('Sync completed');
          queryClient.invalidateQueries();
          break;

        default:
          // Unknown message type - log for debugging
          if (import.meta.env.DEV) {
            console.debug('Unknown WebSocket message type:', message.type);
          }
      }
    },
    [queryClient]
  );

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const subscribeToEntity = useCallback(
    (entityType: string, entityId: string) => {
      const key = `${entityType}:${entityId}`;
      subscriptionsRef.current.add(key);
      send('subscribe', { entityType, entityId });
    },
    [send]
  );

  const unsubscribeFromEntity = useCallback(
    (entityType: string, entityId: string) => {
      const key = `${entityType}:${entityId}`;
      subscriptionsRef.current.delete(key);
      send('unsubscribe', { entityType, entityId });
    },
    [send]
  );

  // Connect on mount (optional - can be disabled for environments without WebSocket)
  useEffect(() => {
    // Only connect if WebSocket URL is configured
    if (import.meta.env.VITE_ENABLE_WEBSOCKET === 'true') {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const value: RealTimeContextValue = {
    status,
    send,
    subscribeToEntity,
    unsubscribeFromEntity,
  };

  return <RealTimeContext.Provider value={value}>{children}</RealTimeContext.Provider>;
}

/**
 * Hook to access real-time WebSocket functionality.
 * Returns a safe default if RealTimeProvider is not available.
 */
export function useRealTime(): RealTimeContextValue {
  const context = useContext(RealTimeContext);

  // Return safe defaults if provider is not available
  // This prevents crashes when the component is used outside the provider
  if (!context) {
    return {
      status: 'disconnected',
      send: () => {},
      subscribeToEntity: () => {},
      unsubscribeFromEntity: () => {},
    };
  }

  return context;
}

// ============================================
// Simple WebSocket Hook (standalone)
// ============================================

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  /** Initial reconnect interval in ms (default: 1000) */
  reconnectInterval?: number;
  /** Maximum reconnect interval in ms (default: 60000) */
  maxReconnectInterval?: number;
  enabled?: boolean;
}

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnectInterval = 1000,
  maxReconnectInterval = 60000,
  enabled = true,
}: UseWebSocketOptions) {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef<number>(0);

  /**
   * Calculate reconnect delay with exponential backoff
   */
  const getReconnectDelay = useCallback(() => {
    const attempt = reconnectAttemptRef.current;
    const baseDelay = Math.min(reconnectInterval * Math.pow(2, attempt), maxReconnectInterval);
    // Add 10% jitter
    const jitter = baseDelay * 0.1 * (Math.random() * 2 - 1);
    return Math.floor(baseDelay + jitter);
  }, [reconnectInterval, maxReconnectInterval]);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        // Reset reconnect attempts on successful connection
        reconnectAttemptRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch {
          onMessage?.(event.data);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        onClose?.();
        // Exponential backoff reconnection
        const delay = getReconnectDelay();
        reconnectAttemptRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = (error) => {
        setStatus('error');
        onError?.(error);
      };
    } catch {
      setStatus('error');
    }
  }, [url, enabled, onMessage, onOpen, onClose, onError, getReconnectDelay]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    // Reset reconnect attempts when manually disconnecting
    reconnectAttemptRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return disconnect;
  }, [connect, disconnect, enabled]);

  return { status, send, disconnect, reconnect: connect };
}
