"use client";
/**
 * @module components/shared/confirm-action-dialog
 * Confirmation dialog for destructive or sensitive user-initiated actions.
 * Uses shadcn Dialog (not AlertDialog — not installed).
 *
 * Security note: this component is UX-only. It does NOT enforce authorization.
 * The caller is responsible for wrapping with PermissionGate and ensuring
 * the backend mutation endpoint enforces role checks independently.
 *
 * Use for: delete user, disable org, approve AI action, module import, secret rotation.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDangerLevel = "default" | "destructive";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title shown in the header. */
  title: string;
  /** Explanatory text shown below the title. Be specific about what will happen. */
  description: string;
  /** Confirm button label. Defaults to "אישור". */
  confirmLabel?: string;
  /** Cancel button label. Defaults to "ביטול". */
  cancelLabel?: string;
  /**
   * "destructive" renders the confirm button in red.
   * Use for irreversible actions (delete, disable).
   */
  dangerLevel?: ConfirmDangerLevel;
  /** Called when the user confirms. Does NOT call onOpenChange — caller closes the dialog. */
  onConfirm: () => void;
  /** Set while the async action is in progress. Disables both buttons + shows spinner. */
  isConfirming?: boolean;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "אישור",
  cancelLabel = "ביטול",
  dangerLevel = "default",
  onConfirm,
  isConfirming = false,
}: ConfirmActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={dangerLevel === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isConfirming}
            className={cn(isConfirming && "cursor-not-allowed opacity-80")}
          >
            {isConfirming && (
              <span
                aria-hidden
                className="size-3 rounded-full border-2 border-white/60 border-t-transparent animate-spin me-2"
              />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
