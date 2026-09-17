import { Component } from 'react';
import { UiContext, useUi } from '../contexts/UiContext';

// Standard React error-boundary shape (react.dev's own documented pattern) -
// nothing in this codebase caught a thrown render-time exception before this;
// without it, an unexpected error anywhere in the tree produced a blank
// white screen with no way to recover short of force-quitting the app.
//
// A class component can't use the useUi() hook, so it reads UiContext
// directly via contextType - falls back to English literals if somehow
// mounted outside the provider (shouldn't happen in this app's tree, but
// a crash screen must never itself crash on a missing translation).
export class ErrorBoundary extends Component {
  static contextType = UiContext;
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    const t = this.context?.t || ((key) => key);
    if (this.state.error) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="bg-kronos-bg border border-red-500/30 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h2 className="text-lg font-black uppercase tracking-tight text-red-400 mb-2">{t('error_boundary.title')}</h2>
            <p className="text-xs text-kronos-dim mb-4">
              {t('error_boundary.message')}
            </p>
            <pre className="text-[10px] text-kronos-dim/70 bg-black/30 rounded-lg p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm bg-kronos-accent text-kronos-bg hover:brightness-110 transition-all"
            >
              {t('error_boundary.reload')}
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
  const { t } = useUi();
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="bg-kronos-bg border border-red-500/30 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-lg font-black uppercase tracking-tight text-red-400 mb-2">{t('error_boundary.load_failed_title')}</h2>
        <p className="text-xs text-kronos-dim mb-4">
          {message || t('error_boundary.load_failed_message')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm bg-kronos-accent text-kronos-bg hover:brightness-110 transition-all"
        >
          {t('error_boundary.retry')}
        </button>
      </div>
    </div>
  );
}
