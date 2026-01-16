// ============================================================================
// Error Boundary Component
// Catches React errors and prevents them from crashing the entire app
// ============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a browser extension error - don't show error UI for these
    if (
      error.message?.includes('deref') ||
      error.message?.includes('content_script') ||
      error.stack?.includes('content_script') ||
      error.stack?.includes('chrome-extension')
    ) {
      // Silently ignore extension errors
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Filter out browser extension errors
    if (
      error.message?.includes('deref') ||
      error.message?.includes('content_script') ||
      error.stack?.includes('content_script') ||
      error.stack?.includes('chrome-extension')
    ) {
      // Silently ignore - these are from browser extensions, not our code
      return;
    }
    
    // Log actual application errors
    console.error('Application Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Show fallback UI for actual errors
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details className="mt-4 text-left text-sm text-gray-500">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
