"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: "size-8", title: "text-sm", desc: "text-xs", py: "py-8" },
  md: { icon: "size-10", title: "text-base", desc: "text-sm", py: "py-12" },
  lg: { icon: "size-14", title: "text-lg", desc: "text-sm", py: "py-16" },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const s = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col items-center gap-3 text-center", s.py, className)}
    >
      {/* Animated icon container */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 300, damping: 20 }}
        className="relative"
      >
        {/* Glow ring */}
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl scale-150" />
        <div className="relative size-16 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center">
          <Icon className={cn(s.icon, "text-muted-foreground/50")} />
        </div>
      </motion.div>

      <div className="space-y-1">
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.3 }}
          className={cn(s.title, "font-semibold text-foreground/80")}
        >
          {title}
        </motion.p>
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.3 }}
            className={cn(s.desc, "text-muted-foreground/60 max-w-xs")}
          >
            {description}
          </motion.p>
        )}
      </div>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.3 }}
        >
          <Button size="sm" onClick={action.onClick} className="mt-1">
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
