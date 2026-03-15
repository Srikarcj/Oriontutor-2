import type { PlanTier } from "./types";

export const FREE_MONTHLY_VIDEO_LIMIT: number | null = null;

export function normalizePlan(value: unknown): PlanTier {
  return "free";
}

export function isPremiumFeatureAllowed(plan: PlanTier, feature: "quiz" | "pdf" | "qa"): boolean {
  if (plan === "free" && (feature === "quiz" || feature === "pdf" || feature === "qa")) return true;
  return true;
}

export function limitForPlan(plan: PlanTier): number | null {
  return FREE_MONTHLY_VIDEO_LIMIT;
}

export function monthStart(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}
