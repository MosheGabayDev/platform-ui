"use client";
/**
 * MessageInput — textarea + send button + (disabled) voice toggle.
 *
 * AI-shell-B Story 2.3. ≤ 120 LOC budget.
 *
 * Voice toggle is rendered but disabled this round; it lights up in AI-shell-D.
 */
import { useCallback, useState } from "react";
import { Send, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { sendChatMessage, StaleContextError } from "@/lib/api/ai";

const CHAR_LIMIT = 2000;

export function MessageInput() {
  const state = useAssistantSession((s) => s.state);
  const draft = useAssistantSession((s) => s.inFlightDraft);
  const setDraft = useAssistantSession((s) => s.setDraft);
  const sendMessage = useAssistantSession((s) => s.sendMessage);
  const receiveResponse = useAssistantSession((s) => s.receiveResponse);
  const failChat = useAssistantSession((s) => s.failChat);
  const context = useAssistantSession((s) => s.currentPageContext);

  const [contextVersion, setContextVersion] = useState(1);

  const disabled = state.kind === "chatting_sending" || state.kind === "executing_action";

  const handleSubmit = useCallback(async () => {
    const text = draft.trim();
    if (!text || disabled) return;
    sendMessage(text);
    try {
      const response = await sendChatMessage({
        message: text,
        context,
        contextVersion,
      });
      setContextVersion(response.contextVersion);
      receiveResponse(response.text);
    } catch (err) {
      if (err instanceof StaleContextError) {
        // Re-emit context (HTTP 409 retry contract per assistant-runtime spec)
        try {
          const retry = await sendChatMessage({
            message: text,
            context,
            contextVersion: contextVersion + 1,
          });
          setContextVersion(retry.contextVersion);
          receiveResponse(retry.text);
        } catch {
          failChat("network");
        }
      } else {
        failChat("llm");
      }
    }
  }, [draft, disabled, sendMessage, context, contextVersion, receiveResponse, failChat]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background p-3">
      <div className="flex gap-2 items-end">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled
          aria-label="Voice mode (coming in AI-shell-D)"
          title="Voice mode (coming soon)"
          className="shrink-0"
        >
          <Mic className="h-4 w-4" />
        </Button>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, CHAR_LIMIT))}
          onKeyDown={onKeyDown}
          placeholder="Ask the assistant…"
          rows={1}
          maxLength={CHAR_LIMIT}
          disabled={disabled}
          className="resize-none min-h-9 max-h-32"
          aria-label="Message input"
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void handleSubmit()}
          disabled={disabled || !draft.trim()}
          aria-label="Send message"
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
