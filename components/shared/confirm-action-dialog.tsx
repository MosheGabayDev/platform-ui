"use client";
/**
 * @module components/shared/confirm-action-dialog
 * Confirmation dialog implementing the Dangerous Action Standard (ADR-021).
 *
 * Renders the correct UX tier based on PlatformAction.dangerLevel:
 *   low/medium  — simple confirm/cancel
 *   high        — destructive button + required reason textarea
 *   critical    — destructive button + required reason + typed confirmation
 *
 * Security note: UX-only. Backend MUST enforce authorization independently.
 * Wrap the trigger button with <PermissionGate> for role checks.
 */

import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DANGER_LEVEL_CONFIG,
  requiresReason,
  requiresTypedConfirmation,
  type PlatformAction,
  type ActionConfirmPayload,
} from "@/lib/platform/actions";

/** Props emitted by useDangerousAction().dialogProps — spread directly. */
export interface ConfirmActionDialogProps {
  open: boolean;
  action: PlatformAction;
  isPending: boolean;
  serverError: string | null;
  onConfirm: (payload: ActionConfirmPayload) => void;
  onCancel: () => void;
}

export function ConfirmActionDialog({
  open,
  action,
  isPending,
  serverError,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  const [reason, setReason] = useState("");
  const [typedConfirm, setTypedConfirm] = useState("");

  const config = DANGER_LEVEL_CONFIG[action.dangerLevel];
  const needsReason = requiresReason(action.dangerLevel) || action.requiresReason;
  const needsTypedConfirm = requiresTypedConfirmation(action.dangerLevel);
  const confirmPhrase = action.label;

  const isConfirmEnabled =
    !isPending &&
    (!needsReason || reason.trim().length > 0) &&
    (!needsTypedConfirm || typedConfirm === confirmPhrase);

  function handleConfirm() {
    if (!isConfirmEnabled) return;
    onConfirm({
      reason: needsReason ? reason.trim() : null,
      confirmedAt: new Date().toISOString(),
    });
  }

  function handleOpenChange(next: boolean) {
    if (!isPending && !next) onCancel();
  }

  // Reset local state when dialog closes
  function handleCancel() {
    setReason("");
    setTypedConfirm("");
    onCancel();
  }

  const DangerIcon = action.dangerLevel === "critical" ? ShieldAlert : AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          {config.label && (
            <div className={cn("flex items-center gap-1.5 text-xs font-medium mb-1", config.colorClass)}>
              <DangerIcon className="size-3.5" aria-hidden />
              <span>{config.label}</span>
            </div>
          )}
          <DialogTitle>{action.label}</DialogTitle>
          {action.description && (
            <DialogDescription>{action.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-1">
          {needsReason && (
            <div className="space-y-1.5">
              <Label htmlFor="action-reason" className="text-sm">
                סיבה <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="action-reason"
                placeholder="פרט את סיבת הפעולה..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                disabled={isPending}
                className="resize-none"
              />
            </div>
          )}

          {needsTypedConfirm && (
            <div className="space-y-1.5">
              <Label htmlFor="action-typed-confirm" className="text-sm">
                הקלד <span className="font-semibold text-foreground">"{confirmPhrase}"</span> לאישור
              </Label>
              <Input
                id="action-typed-confirm"
                dir="rtl"
                value={typedConfirm}
                onChange={(e) => setTypedConfirm(e.target.value)}
                disabled={isPending}
                autoComplete="off"
                placeholder={confirmPhrase}
              />
            </div>
          )}

          {serverError && (
            <p className="text-sm text-destructive" role="alert">
              {serverError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
          <Button
            size="sm"
            variant={config.destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            aria-disabled={!isConfirmEnabled}
          >
            {isPending && (
              <span
                aria-hidden
                className="size-3 rounded-full border-2 border-current/60 border-t-transparent animate-spin me-2"
              />
            )}
            {action.label}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isPending}
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
