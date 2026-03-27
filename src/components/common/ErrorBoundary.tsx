import { Component, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorMessage {
  title: string;
  message: string;
}

// Helper function to determine error type and appropriate message
function getErrorMessage(error: Error): ErrorMessage {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  // Check for network/connectivity errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('offline') ||
    errorMessage.includes('unavailable') ||
    errorMessage.includes('failed to fetch') ||
    errorName.includes('networkerror')
  ) {
    return {
      title: 'Network unavailable',
      message: 'Please check your internet connection and try again.',
    };
  }

  // Check for Firebase auth errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthenticated') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('unauthorized')
  ) {
    return {
      title: 'Authentication required',
      message: 'Your session may have expired. Please refresh the page to sign in again.',
    };
  }

  // Check for Firestore permission errors
  if (
    errorMessage.includes('permission-denied') ||
    errorMessage.includes('insufficient permissions')
  ) {
    return {
      title: 'Access denied',
      message: 'You don\'t have permission to access this resource. Please contact your administrator.',
    };
  }

  // Default error message
  return {
    title: 'Something went wrong',
    message: 'We encountered an unexpected error. Please try again.',
  };
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details to console for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Get appropriate error message based on error type
      const errorMsg = getErrorMessage(this.state.error);

      // Default error UI
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorCard}>
            <div className={styles.iconWrapper}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className={styles.title}>{errorMsg.title}</h2>
            <p className={styles.message}>{errorMsg.message}</p>
            <button
              className={styles.retryButton}
              onClick={this.handleRetry}
              type="button"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <span>Retry</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
