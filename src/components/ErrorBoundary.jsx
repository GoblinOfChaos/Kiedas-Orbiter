import { Component } from 'react';

// Standard React error-boundary shape (react.dev's own documented pattern) -
// nothing in this codebase caught a thrown render-time exception before this;
// without it, an unexpected error anywhere in the tree produced a blank
// white screen with no way to recover short of force-quitting the app.
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="bg-kronos-bg border border-red-500/30 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-tight text-red-400 mb-2">Something went wrong</h2>
            <p className="text-xs text-kronos-dim mb-4">
              An unexpected error occurred and the app couldn't continue. Reloading usually fixes this.
            </p>
            <pre className="text-[10px] text-kronos-dim/70 bg-black/30 rounded-lg p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm bg-kronos-accent text-kronos-bg hover:brightness-110 transition-all"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Distinct from the generic catch-all above: a failed critical data load
// (e.g. load_all_exports erroring out) doesn't throw a JS exception the
// boundary above would catch - it resolves to null and the app would
// otherwise proceed silently in a broken state. This renders the same
// visual treatment for that specific, detected case.
export function CriticalLoadErrorScreen({ message }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-kronos-bg border border-red-500/30 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-lg font-black uppercase tracking-tight text-red-400 mb-2">Failed to load game data</h2>
        <p className="text-xs text-kronos-dim mb-4">
          {message || 'The app could not load its core game-data files and cannot continue. This usually means a disk read error or a corrupted data folder.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm bg-kronos-accent text-kronos-bg hover:brightness-110 transition-all"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
