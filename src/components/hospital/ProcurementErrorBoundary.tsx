import React from "react";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ProcurementErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Procurement crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 rounded-2xl border border-error-500/30 bg-error-500/5">
          <h3 className="font-extrabold text-error-600 mb-2">Procurement failed to load</h3>
          <p className="text-xs text-graphite-500 mb-2">{String(this.state.error.message)}</p>
          <pre className="text-[10px] bg-slate-100 dark:bg-slate-800 p-3 rounded-xl overflow-auto max-h-40">
            {String(this.state.error.stack || "")}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-3 px-3 py-1.5 rounded-xl bg-primary-500 text-white text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
