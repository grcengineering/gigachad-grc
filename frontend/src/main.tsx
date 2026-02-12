import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ModuleProvider } from './contexts/ModuleContext';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus';
import SessionWarning from './components/SessionWarning';
// Error tracking auto-initializes on import (see lib/errorTracking.ts)
import './lib/errorTracking';
// Service worker for PWA support
import * as serviceWorker from './lib/serviceWorker';
import './index.css';

// Hard guardrail: dev auth must never be enabled in production builds
// Note: import.meta.env.PROD is always true during vite build regardless of --mode
// Use MODE to check if this is a production build vs development build
if (import.meta.env.MODE === 'production' && import.meta.env.VITE_ENABLE_DEV_AUTH === 'true') {
  // Fail fast so misconfigured builds don't silently ship
  console.error('VITE_ENABLE_DEV_AUTH is enabled in a production build. This is not allowed.');
  throw new Error('VITE_ENABLE_DEV_AUTH must be false or unset in production builds.');
}

/**
 * Determine if a query error should trigger a retry.
 * Only retries on transient/recoverable errors.
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // Max 3 retries
  if (failureCount >= 3) return false;

  // Check for axios error response
  const axiosError = error as { response?: { status: number }; code?: string };
  
  // Never retry on client errors (4xx) except 408 (timeout) and 429 (rate limit)
  if (axiosError.response?.status) {
    const status = axiosError.response.status;
    
    // Don't retry on client errors (except timeout and rate limit)
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return false;
    }
    
    // Retry on server errors (5xx) and specific recoverable errors
    if ([408, 429, 500, 502, 503, 504].includes(status)) {
      return true;
    }
  }
  
  // Retry on network errors (no response)
  if (axiosError.code === 'ERR_NETWORK' || axiosError.code === 'ECONNABORTED') {
    return true;
  }
  
  // Default: retry once for unknown errors
  return failureCount < 1;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 2 minutes (reduced from 5 for fresher data)
      staleTime: 2 * 60 * 1000,
      // Keep unused data in cache for 10 minutes (reduced from 30 to save memory)
      gcTime: 10 * 60 * 1000,
      // Smart retry logic - only retry on transient errors
      retry: shouldRetryQuery,
      // Exponential backoff with jitter for retries
      retryDelay: (attemptIndex) => {
        const baseDelay = 1000; // 1 second
        const maxDelay = 30000; // 30 seconds
        const exponentialDelay = baseDelay * Math.pow(2, attemptIndex);
        const cappedDelay = Math.min(exponentialDelay, maxDelay);
        // Add 10% jitter to prevent thundering herd
        const jitter = cappedDelay * 0.1 * Math.random();
        return Math.floor(cappedDelay + jitter);
      },
      // Don't refetch on window focus by default (can be overridden per query)
      refetchOnWindowFocus: false,
      // Refetch on reconnect - important for resilience
      refetchOnReconnect: true,
      // Enable structural sharing to prevent unnecessary re-renders
      structuralSharing: true,
      // Network mode - only fetch when online
      networkMode: 'online',
    },
    mutations: {
      // Smart retry for mutations - more conservative
      retry: (failureCount, error) => {
        // Only retry mutations once, and only on server errors
        if (failureCount >= 1) return false;
        const axiosError = error as { response?: { status: number } };
        const status = axiosError.response?.status;
        // Only retry on 502, 503, 504 (gateway/service unavailable)
        return status !== undefined && [502, 503, 504].includes(status);
      },
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrandingProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ModuleProvider>
                  <WorkspaceProvider>
                    {/* Global UI components */}
                    <NetworkStatus />
                    <SessionWarning warningThreshold={2 * 60 * 1000} />
                    <App />
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        className: 'bg-surface-800 text-surface-100 border border-surface-700',
                        duration: 4000,
                      }}
                    />
                  </WorkspaceProvider>
                </ModuleProvider>
              </AuthProvider>
            </QueryClientProvider>
          </BrowserRouter>
        </BrandingProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA support (production only)
if (import.meta.env.PROD) {
  serviceWorker.register({
    onSuccess: () => {
      // App is now available offline
    },
    onUpdate: () => {
      // New version available - show update prompt
      const shouldRefresh = window.confirm(
        'A new version of GigaChad GRC is available. Refresh to update?'
      );
      if (shouldRefresh) {
        serviceWorker.skipWaiting();
        window.location.reload();
      }
    },
  });
}



