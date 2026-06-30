import React from 'react';
import { AlertOctagon } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    
    // Automatically reload once if it's a dynamic import failure or syntax error from Vite on Vercel
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('dynamically imported module') ||
      error.name === 'SyntaxError'
    ) {
      if (!sessionStorage.getItem('reloaded_once_for_chunk')) {
        sessionStorage.setItem('reloaded_once_for_chunk', 'true');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#13151a] text-white p-6">
          <AlertOctagon className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-center">Something went wrong</h1>
          <p className="text-[#8E92A4] text-center max-w-md mb-6 text-sm">
            An unexpected error occurred. If you just logged in, there might have been a new update to the app. Please refresh the page to load the latest version.
          </p>
          <div className="bg-[#1A1C23] p-4 rounded-lg text-left text-xs font-mono text-red-400 max-w-full w-full overflow-auto mb-6 border border-[#2A2D3A]">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => {
              sessionStorage.removeItem('reloaded_once_for_chunk');
              window.location.reload();
            }}
            className="px-6 py-3 bg-[#21D4B5] text-[#13151a] rounded-lg font-bold hover:opacity-90 transition shadow-lg shadow-[#21D4B5]/20"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
