import { Component } from 'react';
import type { ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Shows a friendly message (instead of a blank white page) if a screen ever crashes. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Something went wrong on this page</h2>
          <p className="mt-2 text-sm text-slate-500">
            The server may still be updating or waking up. Wait a moment and reload. If it keeps happening, the backend may need a redeploy.
          </p>
          <p className="mt-3 rounded-lg bg-slate-100 p-2 text-left text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{this.state.error.message}</p>
          <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
