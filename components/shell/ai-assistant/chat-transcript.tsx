"use client";
/**
 * ChatTranscript — scrollable list of messages + sending indicator.
 *
 * AI-shell-B Story 2.3. ≤ 100 LOC budget.
 */
import { useEffect, useRef } from "react";
import { useAssistantSession } from "@/lib/hooks/use-assistant-session";
import { Message } from "./message";

export function ChatTranscript() {
  const transcript = useAssistantSession((s) => s.transcript);
  const state = useAssistantSession((s) => s.state);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message or sending state
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript.length, state.kind]);

  if (transcript.length === 0 && state.kind !== "chatting_sending") {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3"
      role="log"
      aria-live="polite"
      aria-label="Chat transcript"
    >
      {transcript.map((m) => (
        <Message key={m.id} message={m} />
      ))}
      {state.kind === "chatting_sending" && (
        <div className="flex gap-2" data-testid="sending-indicator">
          <div className="h-7 w-7 shrink-0 rounded-full bg-muted" aria-hidden="true" />
          <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            <span className="inline-flex gap-1" aria-label="AI is thinking">
              <span className="animate-pulse">·</span>
              <span className="animate-pulse [animation-delay:200ms]">·</span>
              <span className="animate-pulse [animation-delay:400ms]">·</span>
            </span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
