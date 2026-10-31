/**
 * Daily creative workflow rules and cron authorisation.
 *
 * Kept in a module (rather than inline in `server.mjs`) so the exact scheduling
 * and credential rules can be unit-tested without MongoDB or a live provider.
 */

import { timingSafeEqual } from "node:crypto";
import { ALL_CREATIVE_CATEGORIES, LANGUAGES, PLATFORM_IDS } from "./creative-catalogue.mjs";

export const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * `CRON_SECRET` is mandatory: an unset secret rejects every request instead of
 * accidentally authorising them. Comparison is constant-time.
 */
export const cronAuthorised = request => {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const header = String(request?.get?.("authorization") ?? request?.headers?.authorization ?? "");
  return safeEqual(header, `Bearer ${secret}`);
};

export const CREATIVE_WORKFLOW_KEY = "creativeWorkflow";

export const DEFAULT_CREATIVE_WORKFLOW = {
  enabled: false,
  dailyTarget: 2,
  categories: ["Residential Solar", "Commercial Solar", "Industrial Solar"],
  language: "English",
  platform: "instagram",
  lastRunAt: null,
  lastRunDate: "",
};

export const MAX_DAILY_CREATIVES = 3;

const clampTarget = value => {
  if (value === undefined || value === null || value === "") return DEFAULT_CREATIVE_WORKFLOW.dailyTarget;
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_CREATIVE_WORKFLOW.dailyTarget;
  return Math.min(MAX_DAILY_CREATIVES, Math.max(1, Math.round(number)));
};

/**
 * Normalises an admin submission. Returns `{ ok, value }` or `{ ok:false, error }`
 * so the route can answer 400 without duplicating validation rules.
 */
export const normaliseWorkflowSettings = (input = {}, current = DEFAULT_CREATIVE_WORKFLOW) => {
  const enabled = input.enabled === true;
  const dailyTarget = clampTarget(input.dailyTarget ?? current.dailyTarget ?? 2);
  const categories = Array.isArray(input.categories)
    ? [...new Set(input.categories.filter(item => ALL_CREATIVE_CATEGORIES.includes(item)))].slice(0, 10)
    : Array.isArray(current.categories)
      ? current.categories.filter(item => ALL_CREATIVE_CATEGORIES.includes(item))
      : DEFAULT_CREATIVE_WORKFLOW.categories;
  if (enabled && !categories.length) {
    return { ok: false, error: "Choose at least one creative category before enabling the daily workflow." };
  }
  const language = LANGUAGES.includes(input.language) ? input.language : current.language || "English";
  const platform = PLATFORM_IDS.includes(input.platform) ? input.platform : current.platform || "instagram";
  return {
    ok: true,
    value: { ...current, enabled, dailyTarget, categories, language, platform },
  };
};

/**
 * Which sequences still need generating today. Drafts that already completed
 * are never repeated, and a failed slot is retried at most once per run.
 */
export const planDailySequences = (existing = [], dailyTarget = 2) => {
  const target = clampTarget(dailyTarget);
  const done = new Set(existing.filter(item => item.status === "completed").map(item => Number(item.dailySequence)));
  const pending = new Set(existing.filter(item => item.status !== "failed").map(item => Number(item.dailySequence)));
  const plan = [];
  for (let sequence = 1; sequence <= target; sequence += 1) {
    if (done.has(sequence)) continue;
    if (pending.has(sequence)) continue;
    plan.push(sequence);
  }
  return { target, completed: done.size, becauseTargetReached: done.size >= target, plan };
};

export const categoryForSequence = (categories = [], sequence = 1) =>
  categories.length ? categories[(Math.max(1, sequence) - 1) % categories.length] : ALL_CREATIVE_CATEGORIES[0];
