import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches any render/lifecycle error below it so a single bad input can never
 * blank the whole app. React unmounts the tree on an unhandled error, which
 * previously left the user staring at a white screen with no idea what to do.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep the full detail in the console for debugging — the UI only shows a summary.
    console.error(
      '[Irish Property Reality Check] Unhandled error caught by ErrorBoundary:',
      error,
      errorInfo.componentStack
    );
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="glass-panel"
        style={{
          maxWidth: '640px',
          margin: '48px auto',
          padding: '32px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(38, 15, 24, 0.95) 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <AlertTriangle size={22} color="var(--accent-rose)" />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Well. That fell over.
          </h2>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '12px' }}>
          Something in the Reality Check crashed — which is, admittedly, very on-brand for
          Irish property. Nothing you entered was sent anywhere, so nothing is lost.
        </p>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '20px' }}>
          <strong style={{ color: '#fff' }}>What to do:</strong> reload the page and try again. If you
          pasted a property link, try typing the price, beds and floor area in by hand instead —
          an unusual listing URL is the most likely culprit.
        </p>

        <button
          onClick={this.handleReload}
          className="btn btn-primary"
          style={{ padding: '10px 20px' }}
        >
          <RotateCcw size={16} /> Reload and start again
        </button>

        <details style={{ marginTop: '20px' }}>
          <summary
            style={{
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 700
            }}
          >
            Technical detail
          </summary>
          <pre
            style={{
              marginTop: '10px',
              padding: '12px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              overflowX: 'auto'
            }}
          >
            {error.name}: {error.message}
          </pre>
        </details>
      </div>
    );
  }
}
