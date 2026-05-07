"use client";
/**
 * @module components/shared/record-detail/record-actions-menu
 * Row-level dropdown menu rendering filtered RecordActions for one record.
 *
 * Drop into a DataTable column's `cell` to surface View / Edit / Duplicate /
 * Delete (or any caller-defined custom action) with consistent UX +
 * destructive-confirm dialog + RBAC filtering. Owned by `useRecordActions`.
 *
 * Track C of PLATFORM_HARDENING_PLAN.md.
 */
import {
  Eye, Pencil, Copy, Trash2, MoreHorizontal, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RecordAction, RecordActionKind } from "./types";
import { useRecordActions } from "./use-record-actions";

const KIND_DEFAULT_ICON: Record<RecordActionKind, LucideIcon> = {
  view: Eye,
  edit: Pencil,
  duplicate: Copy,
  delete: Trash2,
  custom: MoreHorizontal,
};

interface RecordActionsMenuProps<T> {
  record: T;
  actions: RecordAction<T>[];
  /** Optional aria-label for the trigger button. Defaults to "Row actions". */
  triggerAriaLabel?: string;
}

export function RecordActionsMenu<T>({
  record,
  actions,
  triggerAriaLabel = "Row actions",
}: RecordActionsMenuProps<T>) {
  const {
    visibleActions,
    invoke,
    pendingActionId,
    confirmState,
    acceptConfirm,
    cancelConfirm,
  } = useRecordActions(actions);

  const visible = visibleActions(record);
  if (visible.length === 0) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={triggerAriaLabel}
            data-testid="record-actions-trigger"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {visible.map((action, idx) => {
            const Icon = action.icon ?? KIND_DEFAULT_ICON[action.kind];
            const isPending = pendingActionId === action.id;
            const isDestructive = action.destructive || action.kind === "delete";
            // Visual separator before the first destructive action.
            const prevWasNonDestructive =
              idx > 0 &&
              !visible[idx - 1].destructive &&
              visible[idx - 1].kind !== "delete";
            return (
              <span key={action.id}>
                {isDestructive && prevWasNonDestructive && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  disabled={pendingActionId !== null}
                  onSelect={(e) => {
                    e.preventDefault();
                    invoke(action, record);
                  }}
                  className={cn(
                    "gap-2 cursor-pointer",
                    isDestructive && "text-rose-600 dark:text-rose-400 focus:text-rose-600 dark:focus:text-rose-400",
                  )}
                  data-testid={`record-action-${action.id}`}
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon className="size-3.5" aria-hidden="true" />
                  )}
                  <span>{action.label}</span>
                </DropdownMenuItem>
              </span>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirmState && (
        <DestructiveConfirmDialog
          action={confirmState.action}
          record={confirmState.record}
          onConfirm={acceptConfirm}
          onCancel={cancelConfirm}
        />
      )}
    </>
  );
}

interface DestructiveConfirmProps<T> {
  action: RecordAction<T>;
  record: T;
  onConfirm: () => void;
  onCancel: () => void;
}

function DestructiveConfirmDialog<T>({
  action,
  record,
  onConfirm,
  onCancel,
}: DestructiveConfirmProps<T>) {
  const [typed, setTyped] = useState("");
  const requiredText = action.confirmTypedName?.(record) ?? "";
  const requiresTyping = requiredText.length > 0;
  const canConfirm = !requiresTyping || typed === requiredText;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="record-destructive-confirm"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Trash2 className="size-4" aria-hidden="true" />
            {action.confirmTitle ?? action.label}
          </DialogTitle>
          {action.confirmDescription && (
            <DialogDescription>{action.confirmDescription}</DialogDescription>
          )}
        </DialogHeader>

        {requiresTyping && (
          <div className="space-y-2 py-2">
            <Label htmlFor="record-destructive-confirm-input" className="text-xs">
              Type <code className="font-mono px-1 bg-muted rounded">{requiredText}</code> to confirm.
            </Label>
            <Input
              id="record-destructive-confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoFocus
              data-testid="record-destructive-confirm-input"
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} data-testid="record-destructive-cancel">
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canConfirm}
            onClick={onConfirm}
            data-testid="record-destructive-confirm-button"
          >
            {action.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
