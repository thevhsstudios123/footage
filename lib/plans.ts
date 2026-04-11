import type { Plan, PlanLimits } from "@/types";

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    generationsPerMonth: 3,
    watermark: true,
    maxDurationSec: 5,
    quality: "standard",
    priorityQueue: false,
    exclusiveStyles: false,
  },
  pro: {
    generationsPerMonth: 30,
    watermark: false,
    maxDurationSec: 5,
    quality: "hd",
    priorityQueue: true,
    exclusiveStyles: false,
  },
  creator: {
    generationsPerMonth: Number.POSITIVE_INFINITY,
    watermark: false,
    maxDurationSec: 10,
    quality: "4k",
    priorityQueue: true,
    exclusiveStyles: true,
  },
};

export const PLAN_PRICING: Record<Plan, { monthly: number; label: string }> = {
  free: { monthly: 0, label: "Free" },
  pro: { monthly: 6.99, label: "Pro" },
  creator: { monthly: 12.99, label: "Creator" },
};
