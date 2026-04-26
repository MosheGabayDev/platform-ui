"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

export type ActionButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Disables button and shows spinner while true. Prevents double-submit. */
    isLoading?: boolean;
    /** Replaces children text while loading. Icon children are unaffected. */
    loadingText?: string;
  };

/**
 * Shared action button with built-in loading / disabled state.
 *
 * Use wherever a mutation trigger button needs a pending indicator.
 * Pairs naturally with useDangerousAction().trigger and usePlatformMutation().isPending.
 *
 * @example
 *   <ActionButton
 *     variant="outline"
 *     size="sm"
 *     isLoading={mutation.isPending}
 *     onClick={mutation.trigger}
 *   >
 *     Save
 *   </ActionButton>
 */
export function ActionButton({
  isLoading = false,
  loadingText,
  disabled,
  children,
  variant,
  size,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      className={className}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full border-2 border-current/60 border-t-transparent animate-spin"
        />
      )}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}
