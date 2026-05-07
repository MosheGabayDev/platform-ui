"use client";
/**
 * @module components/shared/record-detail/record-detail-pane
 * Slide-over pane that renders a record's sections + footer actions.
 *
 * Use when the page wants to surface details + actions inline with the
 * list, rather than navigating to a /record/[id] route. For full-page
 * details, prefer the cap-08 `<DetailHeaderCard>` + `<DetailSection>`
 * primitives.
 *
 * Track C of PLATFORM_HARDENING_PLAN.md.
 */
import { Loader2, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, Pencil, Copy, Trash2 } from "lucide-react";
import type { RecordAction, RecordActionKind, RecordDetailConfig } from "./types";
import { useRecordActions } from "./use-record-actions";

const KIND_DEFAULT_ICON: Record<RecordActionKind, LucideIcon> = {
  view: Eye,
  edit: Pencil,
  duplicate: Copy,
  delete: Trash2,
  custom: MoreHorizontal,
};

interface RecordDetailPaneProps<T> {
  /** The record to render. `null` closes the pane. */
  record: T | null;
  /** Configuration shared with the row-level dropdown. */
  config: RecordDetailConfig<T>;
  /** Caller controls open state — the pane is purely presentational. */
  onClose: () => void;
  /** Optional subtitle slot under the title (e.g. record id, status badge). */
  subtitle?: React.ReactNode;
}

export function RecordDetailPane<T>({
  record,
  config,
  onClose,
  subtitle,
}: RecordDetailPaneProps<T>) {
  const {
    visibleActions,
    invoke,
    pendingActionId,
  } = useRecordActions(config.actions);

  if (!record) return null;

  const visible = visibleActions(record);
  // Don't surface "view" inside the pane — the user is already viewing.
  const footerActions = visible.filter((a) => a.kind !== "view");

  const sections = (config.sections ?? []).filter(
    (s) => !s.visibleWhen || s.visibleWhen(record),
  );

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        // RTL-aware via dir attribute on <html> — physical "right" maps
        // to logical inline-end automatically.
        side="right"
        className="sm:max-w-lg flex flex-col"
        data-testid={`record-detail-pane-${config.recordKind}`}
      >
        <SheetHeader>
          <SheetTitle>{config.getLabel(record)}</SheetTitle>
          {subtitle && <SheetDescription asChild><div>{subtitle}</div></SheetDescription>}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h3>
              <div className="space-y-1">{section.render(record)}</div>
            </div>
          ))}
        </div>

        {footerActions.length > 0 && (
          <SheetFooter className="gap-2 border-t border-border/50 pt-4">
            {footerActions.map((action) => (
              <FooterActionButton
                key={action.id}
                action={action}
                onClick={() => invoke(action, record)}
                isPending={pendingActionId === action.id}
                disabled={pendingActionId !== null}
              />
            ))}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FooterActionButton<T>({
  action,
  onClick,
  isPending,
  disabled,
}: {
  action: RecordAction<T>;
  onClick: () => void;
  isPending: boolean;
  disabled: boolean;
}) {
  const Icon = action.icon ?? KIND_DEFAULT_ICON[action.kind];
  const isDestructive = action.destructive || action.kind === "delete";
  return (
    <Button
      variant={isDestructive ? "destructive" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn("gap-2")}
      data-testid={`record-pane-action-${action.id}`}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="size-3.5" aria-hidden="true" />
      )}
      {action.label}
    </Button>
  );
}
