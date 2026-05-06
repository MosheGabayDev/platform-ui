"use client";
/**
 * @module components/shared/wizard/wizard
 * PlatformWizard primitive (cap 15, Phase 1.5).
 *
 * Spec: docs/system-upgrade/04-capabilities/platform-wizard-spec.md
 *
 * Composition pattern: caller passes a `WizardConfig<TState>`. The wizard
 * owns step navigation, validation gating, persist, and chrome (indicator
 * + footer). Step bodies are rendered via `step.render({ state, update,
 * goNext, goBack })` — fully controlled by the caller.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, ChevronLeft, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useWizardState, clearWizardStorage } from "@/lib/hooks/use-wizard-state";
import type { WizardConfig } from "@/lib/modules/wizard/types";

interface WizardProps<TState> {
  config: WizardConfig<TState>;
  /** Optional — render label_he when set, else label. */
  preferHebrew?: boolean;
}

export function Wizard<TState>({ config, preferHebrew = true }: WizardProps<TState>) {
  const t = useTranslations("wizard");
  // Filter visible steps based on hideWhen, evaluated against current state.
  // We compute this on every render because a step may become hidden after
  // the user changes a preceding choice.
  const wizard = useWizardState<TState>({
    storageKey: config.storageKey,
    initialState: config.initialState,
    totalSteps: config.steps.length,
  });

  const visibleSteps = useMemo(
    () => config.steps.filter((s) => !s.hideWhen?.(wizard.state)),
    [config.steps, wizard.state],
  );

  const safeIndex = Math.min(wizard.currentIndex, visibleSteps.length - 1);
  const step = visibleSteps[safeIndex];
  const isLast = safeIndex === visibleSteps.length - 1;

  const validationError = step?.validate?.(wizard.state) ?? null;
  const canAdvance = validationError === null;

  const [isCompleting, setIsCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  // Move focus to step heading on transition for screen readers.
  const headingRef = useFocusOnChange(step?.id);

  async function handleFinish() {
    if (!canAdvance) return;
    setIsCompleting(true);
    setCompleteError(null);
    try {
      await config.onComplete(wizard.state);
      clearWizardStorage(config.storageKey);
    } catch (e) {
      setCompleteError((e as Error).message);
    } finally {
      setIsCompleting(false);
    }
  }

  function handleCancel() {
    if (config.onCancel) config.onCancel();
    else {
      clearWizardStorage(config.storageKey);
    }
  }

  if (!wizard.isHydrated) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (!step) {
    return null;
  }

  const stepLabel = (preferHebrew && step.label_he) || step.label;
  const title = (preferHebrew && config.title_he) || config.title;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{title}</h1>
      </header>

      <StepIndicator
        steps={visibleSteps.map((s) => ({
          id: s.id,
          label: (preferHebrew && s.label_he) || s.label,
        }))}
        currentIndex={safeIndex}
        ariaLabel={t("stepsAria")}
      />

      <div
        ref={headingRef}
        tabIndex={-1}
        className="glass border-border/50 rounded-xl p-4 sm:p-6 outline-none"
        aria-describedby={validationError ? "wizard-validation-error" : undefined}
      >
        <div className="space-y-1 mb-4">
          <h2 className="text-base font-medium">{stepLabel}</h2>
          {step.description && (
            <p className="text-sm text-muted-foreground">{step.description}</p>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {step.render({
              state: wizard.state,
              update: wizard.update,
              goNext: wizard.goNext,
              goBack: wizard.goBack,
            })}
          </motion.div>
        </AnimatePresence>

        {validationError && (
          <p
            id="wizard-validation-error"
            className="text-xs text-rose-600 dark:text-rose-400 mt-3"
            role="alert"
          >
            {validationError}
          </p>
        )}
        {completeError && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-3" role="alert">
            {completeError}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          aria-label={t("cancelLabel")}
        >
          <X className="h-3.5 w-3.5 me-1" aria-hidden="true" />
          {t("cancel")}
        </Button>
        <div className="flex gap-2">
          {safeIndex > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={wizard.goBack}
              disabled={isCompleting}
            >
              <ChevronRight className="h-3.5 w-3.5 me-1 rtl:rotate-180" aria-hidden="true" />
              {t("back")}
            </Button>
          )}
          {!isLast && step.optional && (
            <Button
              variant="ghost"
              size="sm"
              onClick={wizard.goNext}
              disabled={isCompleting}
              aria-label={t("skipLabel")}
            >
              {t("skip")}
            </Button>
          )}
          {!isLast && (
            <Button
              variant="default"
              size="sm"
              onClick={wizard.goNext}
              disabled={!canAdvance || isCompleting}
              aria-label={t("nextLabel")}
            >
              {t("next")}
              <ChevronLeft className="h-3.5 w-3.5 ms-1 rtl:rotate-180" aria-hidden="true" />
            </Button>
          )}
          {isLast && (
            <Button
              variant="default"
              size="sm"
              onClick={handleFinish}
              disabled={!canAdvance || isCompleting}
            >
              {isCompleting ? (
                <Loader2 className="h-3.5 w-3.5 me-1 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5 me-1" aria-hidden="true" />
              )}
              {t("finish")}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

interface StepIndicatorProps {
  steps: Array<{ id: string; label: string }>;
  currentIndex: number;
  ariaLabel: string;
}

function StepIndicator({ steps, currentIndex, ariaLabel }: StepIndicatorProps) {
  return (
    <ol
      className="flex items-center gap-2 overflow-x-auto pb-1"
      aria-label={ariaLabel}
    >
      {steps.map((s, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <li
            key={s.id}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs whitespace-nowrap shrink-0",
              isCurrent
                ? "border-primary bg-primary/10 text-foreground font-medium"
                : isDone
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "border-border/60 text-muted-foreground",
            ].join(" ")}
          >
            <span
              className={[
                "inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-medium",
                isCurrent
                  ? "bg-primary text-primary-foreground"
                  : isDone
                    ? "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {isDone ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
            </span>
            <span>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

import { useRef } from "react";

function useFocusOnChange<T>(value: T) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return ref;
}
