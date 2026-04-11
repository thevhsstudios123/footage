"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { GenerationStatus as Status } from "@/types";
import { cn } from "@/lib/utils";

interface StatusMsg {
  message: string;
  from: number;
  to: number;
}

const STATUS_MESSAGES: Record<Status, StatusMsg | null> = {
  idle: null,
  "detecting-face": {
    message: "Detecting your face… 🔍",
    from: 0,
    to: 15,
  },
  "building-mask": {
    message: "Protecting your features… 🛡️",
    from: 15,
    to: 28,
  },
  uploading: {
    message: "Uploading your photo… 📤",
    from: 28,
    to: 40,
  },
  queued: {
    message: "Queued up in the sky… ☁️",
    from: 40,
    to: 48,
  },
  generating: {
    message: "Generating your aerial shot… 🚁",
    from: 48,
    to: 85,
  },
  "restoring-face": {
    message: "Restoring face details… ✨",
    from: 85,
    to: 95,
  },
  verifying: {
    message: "Verifying face preservation… 🧐",
    from: 95,
    to: 99,
  },
  complete: {
    message: "Ready! 🎬",
    from: 100,
    to: 100,
  },
  failed: null,
};

interface GenerationStatusProps {
  status: Status;
  className?: string;
}

export function GenerationStatus({ status, className }: GenerationStatusProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const entry = STATUS_MESSAGES[status];
    if (!entry) return;
    // Animate from current value up toward `to`
    let raf = 0;
    let start: number | null = null;
    const duration = 2000;
    const startVal = displayValue;
    const target = entry.to;

    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const v = startVal + (target - startVal) * p;
      setDisplayValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const entry = STATUS_MESSAGES[status];
  if (!entry && status !== "failed") return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 animate-fade-in",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {status === "failed"
            ? "Generation failed — please try again"
            : entry?.message}
        </p>
        <span className="text-xs tabular-nums text-muted-foreground">
          {Math.round(displayValue)}%
        </span>
      </div>
      <Progress value={displayValue} />
    </div>
  );
}
