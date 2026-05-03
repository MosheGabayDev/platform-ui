"use client";
/**
 * TicketActions — Phase B action buttons (take/resolve/reassign/comment).
 *
 * Mock-mode mutations defined in `lib/api/helpdesk.ts`. When R046-min audit
 * + notifications backend lands, MOCK_MODE flips to false and the same
 * buttons hit Flask `/api/proxy/helpdesk/api/tickets/<id>/{take,resolve,...}`.
 *
 * Spec: docs/modules/04-helpdesk/AI_READINESS.md (action capability levels)
 */
import { useState } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, CheckCircle, MessageSquarePlus, Users as UsersIcon } from "lucide-react";
import { ActionButton } from "@/components/shared/action-button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useTakeTicket,
  useResolveTicket,
  useReassignTicket,
  useCommentOnTicket,
} from "@/lib/modules/helpdesk/hooks";
import type { TicketDetail } from "@/lib/modules/helpdesk/types";
import type { PlatformAction } from "@/lib/platform/actions";

interface TicketActionsProps {
  ticket: TicketDetail;
  /** Whether the current user can manage tickets (admin/manager/technician). */
  canManage: boolean;
}

const RESOLVE_ACTION: PlatformAction = {
  id: "helpdesk.ticket.resolve",
  label: "סגור קריאה",
  description: "האם אתה בטוח שברצונך לסגור את הקריאה? פעולה זו ניתנת להחזרה רק ע\"י מנהל.",
  dangerLevel: "high",
  requiresConfirmation: true,
  requiresReason: true,
  auditEvent: "helpdesk.ticket.resolve",
  resourceType: "ticket",
};

export function TicketActions({ ticket, canManage }: TicketActionsProps) {
  const { data: session } = useSession();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const take = useTakeTicket(ticket.id);
  const resolve = useResolveTicket(ticket.id);
  const reassign = useReassignTicket(ticket.id);
  const comment = useCommentOnTicket(ticket.id);

  const isTerminal = ticket.status === "resolved" || ticket.status === "closed";
  // Compare against the actual signed-in user (Q-HD review fix). Falls back to
  // false when session is loading — Take button stays visible until we know.
  const currentUserId = session?.user?.id ?? null;
  const isAssignedToMe =
    currentUserId !== null && ticket.assignee_id === currentUserId;

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">
        You don&apos;t have permission to act on this ticket.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!isTerminal && !isAssignedToMe && (
          <ActionButton
            onClick={() => take.mutate({ ticketId: ticket.id })}
            isLoading={take.isPending}
            variant="default"
            size="sm"
          >
            <UserPlus className="h-4 w-4 me-1.5" aria-hidden="true" />
            Take ticket
          </ActionButton>
        )}

        {!isTerminal && (
          <ActionButton
            onClick={() => setResolveOpen(true)}
            isLoading={resolve.isPending}
            variant="default"
            size="sm"
          >
            <CheckCircle className="h-4 w-4 me-1.5" aria-hidden="true" />
            Resolve
          </ActionButton>
        )}

        {!isTerminal && (
          <ActionButton
            onClick={() =>
              reassign.mutate({
                ticketId: ticket.id,
                assigneeId: 3, // mock: reassign to OnCall Olivia
                reason: "Demo reassignment (mock mode)",
              })
            }
            isLoading={reassign.isPending}
            variant="outline"
            size="sm"
          >
            <UsersIcon className="h-4 w-4 me-1.5" aria-hidden="true" />
            Reassign
          </ActionButton>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <label className="text-sm font-medium" htmlFor="ticket-comment">
          Add comment
        </label>
        <Textarea
          id="ticket-comment"
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          rows={2}
          placeholder="Add a comment..."
          maxLength={500}
        />
        <div className="flex justify-end">
          <ActionButton
            onClick={async () => {
              if (!commentDraft.trim()) return;
              try {
                await comment.mutateAsync({
                  ticketId: ticket.id,
                  content: commentDraft.trim(),
                });
                setCommentDraft("");
              } catch {
                // serverError already surfaced via toast in onError
              }
            }}
            isLoading={comment.isPending}
            disabled={!commentDraft.trim()}
            variant="default"
            size="sm"
          >
            <MessageSquarePlus className="h-4 w-4 me-1.5" aria-hidden="true" />
            Post comment
          </ActionButton>
        </div>
      </div>

      <ConfirmActionDialog
        open={resolveOpen}
        action={RESOLVE_ACTION}
        isPending={resolve.isPending}
        serverError={resolve.serverError}
        onConfirm={async (payload) => {
          try {
            await resolve.mutateAsync({
              ticketId: ticket.id,
              resolution: payload.reason ?? "Resolved",
            });
            setResolveOpen(false);
          } catch {
            // serverError surfaces via dialog
          }
        }}
        onCancel={() => setResolveOpen(false)}
      />
    </div>
  );
}
