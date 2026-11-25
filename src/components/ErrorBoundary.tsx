import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error) {
    console.error('AgriSmart UI ErrorBoundary caught:', error);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let friendlyDetail = this.state.message;
    try {
      const parsed = JSON.parse(this.state.message);
      if (parsed?.operationType && parsed?.path) {
        friendlyDetail = `Database permission check blocked ${parsed.operationType} on ${parsed.path}. Please verify your sign-in role or try again.`;
      }
    } catch {
      // Plain error message
    }

    return (
      <div className="min-h-screen bg-[#F6F7F4] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-[#DCE3D7] rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#17211A]">Something interrupted AgriSmart</h1>
              <p className="text-sm text-[#526157] mt-1 leading-relaxed">{friendlyDetail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#1B5E3C] text-white text-sm font-medium hover:bg-[#14482D] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload AgriSmart
          </button>
        </div>
      </div>
    );
  }
}
