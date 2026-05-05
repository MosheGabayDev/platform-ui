"use client";
/**
 * @module lib/hooks/use-wizard-state
 * State + localStorage persist for PlatformWizard (cap 15).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-wizard-spec.md §5
 *
 * Hydrate-on-mount, debounced write, version-namespaced storage key.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { PersistedWizardState } from "@/lib/modules/wizard/types";

const PERSIST_DEBOUNCE_MS = 300;

export interface UseWizardStateOptions<TState> {
  storageKey: string;
  initialState: TState;
  totalSteps: number;
}

export interface UseWizardStateResult<TState> {
  state: TState;
  update: (patch: Partial<TState>) => void;
  setState: (next: TState) => void;
  currentIndex: number;
  goNext: () => void;
  goBack: () => void;
  goTo: (index: number) => void;
  reset: () => void;
  isHydrated: boolean;
}

function readPersisted<TState>(
  storageKey: string,
): PersistedWizardState<TState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWizardState<TState>;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersisted<TState>(
  storageKey: string,
  payload: PersistedWizardState<TState>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // quota / private mode — silent (user will lose resume; not catastrophic)
  }
}

function clearPersisted(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    /* noop */
  }
}

export function useWizardState<TState>({
  storageKey,
  initialState,
  totalSteps,
}: UseWizardStateOptions<TState>): UseWizardStateResult<TState> {
  const [state, setStateRaw] = useState<TState>(initialState);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const persisted = readPersisted<TState>(storageKey);
    if (persisted && persisted.currentIndex < totalSteps) {
      setStateRaw(persisted.state);
      setCurrentIndex(persisted.currentIndex);
    }
    setIsHydrated(true);
  }, [storageKey, totalSteps]);

  // Debounced persist whenever state or currentIndex changes (post-hydrate).
  useEffect(() => {
    if (!isHydrated) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      writePersisted(storageKey, { state, currentIndex, version: 1 });
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [state, currentIndex, storageKey, isHydrated]);

  const update = useCallback((patch: Partial<TState>) => {
    setStateRaw((prev) => ({ ...prev, ...patch }));
  }, []);

  const setState = useCallback((next: TState) => {
    setStateRaw(next);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalSteps - 1));
      setCurrentIndex(clamped);
    },
    [totalSteps],
  );

  const reset = useCallback(() => {
    clearPersisted(storageKey);
    setStateRaw(initialState);
    setCurrentIndex(0);
  }, [storageKey, initialState]);

  return {
    state,
    update,
    setState,
    currentIndex,
    goNext,
    goBack,
    goTo,
    reset,
    isHydrated,
  };
}

/** Test/imperative helper — clear a wizard's persisted state without rendering. */
export function clearWizardStorage(storageKey: string): void {
  clearPersisted(storageKey);
}
