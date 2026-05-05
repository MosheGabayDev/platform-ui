/**
 * useWizardState tests (cap 15, Phase 1.5).
 * Covers: initial state, hydrate from localStorage, debounced persist,
 * navigation (next/back/clamp), reset clearing storage.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useWizardState,
  clearWizardStorage,
} from "./use-wizard-state";

const STORAGE_KEY = "wizard:test:v1";
const TOTAL_STEPS = 4;

interface TestState {
  name: string;
  count: number;
}

const INITIAL: TestState = { name: "", count: 0 };

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useWizardState", () => {
  it("initializes with initialState and currentIndex=0", async () => {
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: TOTAL_STEPS,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.state).toEqual(INITIAL);
    expect(result.current.currentIndex).toBe(0);
  });

  it("update() merges patches into state", async () => {
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: TOTAL_STEPS,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.update({ name: "Acme" }));
    expect(result.current.state.name).toBe("Acme");
    expect(result.current.state.count).toBe(0);
    act(() => result.current.update({ count: 5 }));
    expect(result.current.state).toEqual({ name: "Acme", count: 5 });
  });

  it("goNext clamps at totalSteps - 1", async () => {
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: 3,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    act(() => result.current.goNext());
    expect(result.current.currentIndex).toBe(2);
  });

  it("goBack clamps at 0", async () => {
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: 3,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.goBack());
    expect(result.current.currentIndex).toBe(0);
  });

  it("goTo clamps to valid range", async () => {
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: 3,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.goTo(99));
    expect(result.current.currentIndex).toBe(2);
    act(() => result.current.goTo(-5));
    expect(result.current.currentIndex).toBe(0);
  });

  it("persists state to localStorage after debounce", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: TOTAL_STEPS,
      }),
    );
    // Hydration uses a synchronous useEffect (no timer). Wait for it.
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.isHydrated).toBe(true);

    act(() => {
      result.current.update({ name: "Persisted" });
      result.current.goNext();
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.state.name).toBe("Persisted");
    expect(parsed.currentIndex).toBe(1);
    expect(parsed.version).toBe(1);
  });

  it("hydrates from localStorage on mount", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { name: "Restored", count: 7 }, currentIndex: 2, version: 1 }),
    );
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: TOTAL_STEPS,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.state).toEqual({ name: "Restored", count: 7 });
    expect(result.current.currentIndex).toBe(2);
  });

  it("ignores persisted state with mismatched version", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { name: "stale", count: 99 }, currentIndex: 1, version: 999 }),
    );
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: TOTAL_STEPS,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.state).toEqual(INITIAL);
    expect(result.current.currentIndex).toBe(0);
  });

  it("ignores persisted state with currentIndex >= totalSteps", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { name: "x", count: 1 }, currentIndex: 99, version: 1 }),
    );
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: 4,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.state).toEqual(INITIAL);
  });

  it("reset() clears storage and returns to initial", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { name: "old", count: 10 }, currentIndex: 2, version: 1 }),
    );
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: TOTAL_STEPS,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.reset());
    expect(result.current.state).toEqual(INITIAL);
    expect(result.current.currentIndex).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("clearWizardStorage helper removes the key", () => {
    window.localStorage.setItem(STORAGE_KEY, "anything");
    clearWizardStorage(STORAGE_KEY);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("survives malformed persisted JSON", async () => {
    window.localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    const { result } = renderHook(() =>
      useWizardState<TestState>({
        storageKey: STORAGE_KEY,
        initialState: INITIAL,
        totalSteps: TOTAL_STEPS,
      }),
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.state).toEqual(INITIAL);
  });
});
