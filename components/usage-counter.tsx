"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/types";
import { PLAN_LIMITS } from "@/lib/plans";

interface UsageCounterProps {
  plan: Plan;
  used: number;
  onUpgrade: () => void;
}

export function UsageCounter({ plan, used, onUpgrade }: UsageCounterProps) {
  const limit = PLAN_LIMITS[plan].generationsPerMonth;
  const isUnlimited = limit === Number.POSITIVE_INFINITY;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/70 px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">
          {isUnlimited
            ? `${used} clips this month · unlimited`
            : `${used} of ${limit} free clips used this month`}
        </span>
      </div>
      {plan !== "creator" && (
        <Button size="sm" variant="gradient" onClick={onUpgrade}>
          Upgrade
        </Button>
      )}
    </div>
  );
}
