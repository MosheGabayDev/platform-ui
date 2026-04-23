"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

type Status = "connected" | "disconnected" | "reconnecting";

export function ConnectionIndicator() {
  const [status, setStatus] = useState<Status>("connected");
  const [latency, setLatency] = useState(12);

  useEffect(() => {
    const handleOnline = () => setStatus("connected");
    const handleOffline = () => setStatus("disconnected");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    /* Simulate latency drift */
    const interval = setInterval(() => {
      setLatency(prev => Math.max(4, Math.min(340, prev + (Math.random() - 0.48) * 10)));
    }, 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const dotColor =
    status === "connected" ? "bg-emerald-400" :
    status === "reconnecting" ? "bg-amber-400" :
    "bg-red-400";

  const glowColor =
    status === "connected" ? "shadow-[0_0_6px_1px_rgba(52,211,153,0.6)]" :
    status === "reconnecting" ? "shadow-[0_0_6px_1px_rgba(251,191,36,0.6)]" :
    "shadow-[0_0_6px_1px_rgba(248,113,113,0.6)]";

  const label =
    status === "connected" ? `מחובר · ${Math.round(latency)}ms` :
    status === "reconnecting" ? "מתחבר מחדש..." :
    "מנותק";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default select-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`size-2 rounded-full shrink-0 ${dotColor} ${glowColor} ${
                  status !== "connected" ? "animate-pulse" : ""
                }`}
              />
            </AnimatePresence>
            <span className="hidden sm:block text-[11px] text-muted-foreground/70 tabular-nums">
              {status === "connected" ? `${Math.round(latency)}ms` : status === "reconnecting" ? "..." : "✕"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
