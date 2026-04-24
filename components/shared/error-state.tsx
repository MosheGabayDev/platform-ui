"use client";
/**
 * @module components/shared/error-state
 * Standard API error display with optional retry button.
 * Handles 401/403/404/500 status codes and generic network errors.
 *
 * Security note: never renders raw backend stack traces.
 * Displays a user-friendly message derived from the HTTP status code in the error message.
 */

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateMessages {
  /** Message for HTTP 401 errors. */
  401?: string;
  /** Message for HTTP 403 errors. */
  403?: string;
  /** Message for HTTP 404 errors. */
  404?: string;
  /** Fallback for all other errors. */
  default?: string;
}

interface ErrorStateProps {
  /** The error object. Inspects message for HTTP status codes. */
  error: Error | null | unknown;
  /** Optional retry callback. Shows "נסה שוב" button when provided. */
  onRetry?: () => void;
  /** Custom messages per error code. Falls back to Hebrew defaults. */
  messages?: ErrorStateMessages;
  className?: string;
}

function resolveMessage(error: ErrorStateProps["error"], messages?: ErrorStateMessages): string {
  if (!(error instanceof Error)) return messages?.default ?? "שגיאה לא ידועה";
  const msg = error.message;
  if (msg.includes("401")) return messages?.[401] ?? "נדרשת התחברות מחדש";
  if (msg.includes("403")) return messages?.[403] ?? "אין הרשאה לבצע פעולה זו";
  if (msg.includes("404")) return messages?.[404] ?? "הפריט לא נמצא";
  return messages?.default ?? msg;
}

export function ErrorState({ error, onRetry, messages, className }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 flex items-center gap-3 ${className ?? ""}`}
    >
      <AlertCircle className="size-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">
        {resolveMessage(error, messages)}
      </span>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="me-auto h-7 text-xs shrink-0"
          onClick={onRetry}
        >
          נסה שוב
        </Button>
      )}
    </motion.div>
  );
}
