"use client";

import { Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLAN_PRICING } from "@/lib/plans";
import type { Plan } from "@/types";
import { cn } from "@/lib/utils";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: "quota" | "creator-lock";
  onChoosePlan?: (plan: Plan) => void;
}

const TIERS: {
  plan: Plan;
  features: string[];
  cta: string;
  highlight?: boolean;
}[] = [
  {
    plan: "free",
    features: [
      "3 generations / month",
      "5 second clips",
      "Standard quality",
      "Watermark",
    ],
    cta: "Current",
  },
  {
    plan: "pro",
    features: [
      "30 generations / month",
      "HD quality",
      "No watermark",
      "Priority queue",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    plan: "creator",
    features: [
      "Unlimited generations",
      "4K quality",
      "No watermark",
      "Priority queue",
      "4 exclusive styles",
    ],
    cta: "Go Creator",
  },
];

export function PricingModal({
  open,
  onOpenChange,
  reason,
  onChoosePlan,
}: PricingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {reason === "creator-lock"
              ? "Unlock exclusive styles"
              : reason === "quota"
              ? "You've hit your free limit"
              : "Upgrade your SkySnap"}
          </DialogTitle>
          <DialogDescription>
            Keep making cinematic videos without limits.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          {TIERS.map((tier) => {
            const pricing = PLAN_PRICING[tier.plan];
            return (
              <div
                key={tier.plan}
                className={cn(
                  "rounded-2xl border p-4 transition-all",
                  tier.highlight
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-card"
                )}
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {pricing.label}
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-bold">
                    ${pricing.monthly.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
                <ul className="mb-4 space-y-1.5 text-xs">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={tier.highlight ? "gradient" : "outline"}
                  className="w-full"
                  disabled={tier.plan === "free"}
                  onClick={() => onChoosePlan?.(tier.plan)}
                >
                  {tier.cta}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
