import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Card, CardBody } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="max-w-lg w-full">
            <CardBody density="comfy" className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mb-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-h2 text-surface-900 mb-1">Something went wrong</h2>
              <p className="text-small text-surface-600 mb-4">
                {this.state.error.message || 'An unexpected error occurred while rendering this page.'}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={this.reset}>
                  Try again
                </Button>
                <Button
                  size="sm"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  onClick={() => window.location.reload()}
                >
                  Reload page
                </Button>
              </div>
              {import.meta.env.DEV && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-surface-500 cursor-pointer">
                    Stack trace (dev only)
                  </summary>
                  <pre className="text-xs text-surface-500 mt-2 p-2 bg-surface-50 rounded overflow-auto max-h-48 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardBody>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
