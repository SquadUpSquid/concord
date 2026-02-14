import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-bg-tertiary">
          <h1 className="text-xl font-bold text-red">Something went wrong</h1>
          <p className="max-w-md text-center text-sm text-text-muted">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded bg-accent px-4 py-2 text-sm text-white hover:bg-accent-hover"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
