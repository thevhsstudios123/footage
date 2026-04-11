/**
 * Ephemeral usage tracking.
 *
 * In production, wire this to your database (Postgres/Redis/Upstash). For now
 * we use an in-memory map keyed by userId — good enough for local dev and
 * single-instance deploys. Resets on server restart.
 *
 * Each user has a month-bucket counter. Bucket resets on month rollover.
 */

import { PLAN_LIMITS } from "./plans";
import type { Plan } from "@/types";

interface UsageRecord {
  month: string; // YYYY-MM
  count: number;
}

const usageMap = new Map<string, UsageRecord>();

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getUsage(userId: string): number {
  const rec = usageMap.get(userId);
  const month = currentMonth();
  if (!rec || rec.month !== month) return 0;
  return rec.count;
}

export function incrementUsage(userId: string): number {
  const month = currentMonth();
  const rec = usageMap.get(userId);
  if (!rec || rec.month !== month) {
    usageMap.set(userId, { month, count: 1 });
    return 1;
  }
  rec.count += 1;
  return rec.count;
}

export function hasQuotaRemaining(userId: string, plan: Plan): boolean {
  const limit = PLAN_LIMITS[plan].generationsPerMonth;
  if (limit === Number.POSITIVE_INFINITY) return true;
  return getUsage(userId) < limit;
}

export function usageSummary(
  userId: string,
  plan: Plan
): { used: number; limit: number | "unlimited" } {
  const limit = PLAN_LIMITS[plan].generationsPerMonth;
  return {
    used: getUsage(userId),
    limit: limit === Number.POSITIVE_INFINITY ? "unlimited" : limit,
  };
}
