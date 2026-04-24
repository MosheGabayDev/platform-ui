"use client";
/**
 * @module components/shared/error-boundary
 * React ErrorBoundary class component for catching client-side render errors.
 * Wraps all dashboard routes in app/(dashboard)/layout.tsx.
 *
 * Security note: never exposes stack traces or internal IDs to the UI.
 * Raw error details are logged to console for debugging — not rendered.
 */

import React from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback. Defaults to a generic error card. */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  requestId: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, requestId: null };
  }

  static getDerivedStateFromError(): State {
    const requestId = `pui-${Date.now().toString(36)}`;
    return { hasError: true, requestId };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console only — never render stack trace in UI
    console.error("[ErrorBoundary] Render error:", error.message, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, requestId: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 space-y-2 mt-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span className="text-sm font-medium">אירעה שגיאה בלתי צפויה</span>
        </div>
        <p className="text-xs text-muted-foreground">
          מזהה בקשה: <span className="font-mono">{this.state.requestId}</span>
        </p>
        <button
          className="text-xs text-primary underline hover:no-underline"
          onClick={this.handleReset}
        >
          נסה שוב
        </button>
      </div>
    );
  }
}
