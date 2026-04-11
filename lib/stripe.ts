import Stripe from "stripe";
import type { Plan } from "@/types";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  cached = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return cached;
}

export function priceIdForPlan(plan: Plan): string | undefined {
  switch (plan) {
    case "pro":
      return process.env.STRIPE_PRO_PRICE_ID;
    case "creator":
      return process.env.STRIPE_CREATOR_PRICE_ID;
    default:
      return undefined;
  }
}

export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_CREATOR_PRICE_ID) return "creator";
  return "free";
}
