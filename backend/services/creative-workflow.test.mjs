import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CREATIVE_WORKFLOW,
  MAX_DAILY_CREATIVES,
  categoryForSequence,
  cronAuthorised,
  normaliseWorkflowSettings,
  planDailySequences,
  safeEqual,
} from "./creative-workflow.mjs";

const request = authorization => ({ get: header => (header.toLowerCase() === "authorization" ? authorization : undefined) });

test("cron requests are rejected when CRON_SECRET is missing", () => {
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  assert.equal(cronAuthorised(request("Bearer ")), false);
  assert.equal(cronAuthorised(request("")), false);
  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;
});

test("only the exact bearer credential is accepted", () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "  super-secret-value  ";
  assert.equal(cronAuthorised(request("Bearer super-secret-value")), true);
  assert.equal(cronAuthorised(request("Bearer super-secret-valu")), false);
  assert.equal(cronAuthorised(request("Bearer super-secret-value ")), false);
  assert.equal(cronAuthorised(request("super-secret-value")), false);
  assert.equal(cronAuthorised(request("bearer super-secret-value")), false);
  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;
});

test("safeEqual never treats different lengths as equal", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abcd"), false);
  assert.equal(safeEqual("", "x"), false);
});

test("the daily target is clamped to the 2-3 draft budget", () => {
  assert.equal(normaliseWorkflowSettings({ dailyTarget: 9 }).value.dailyTarget, MAX_DAILY_CREATIVES);
  assert.equal(normaliseWorkflowSettings({ dailyTarget: 0 }).value.dailyTarget, 1);
  assert.equal(normaliseWorkflowSettings({ dailyTarget: "2" }).value.dailyTarget, 2);
  assert.equal(normaliseWorkflowSettings({}).value.dailyTarget, DEFAULT_CREATIVE_WORKFLOW.dailyTarget);
});

test("the workflow cannot be enabled without a valid category", () => {
  const rejected = normaliseWorkflowSettings({ enabled: true, categories: ["Not A Category"] });
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /category/i);
  const disabled = normaliseWorkflowSettings({ enabled: false, categories: ["Not A Category"] }, { ...DEFAULT_CREATIVE_WORKFLOW, categories: [] });
  assert.equal(disabled.ok, true);
  assert.deepEqual(disabled.value.categories, []);
});

test("unknown languages and platforms fall back to the stored values", () => {
  const result = normaliseWorkflowSettings({ language: "Klingon", platform: "myspace" }, { ...DEFAULT_CREATIVE_WORKFLOW, language: "Marathi", platform: "linkedin" });
  assert.equal(result.value.language, "Marathi");
  assert.equal(result.value.platform, "linkedin");
  assert.equal(normaliseWorkflowSettings({ language: "Hindi" }).value.language, "Hindi");
});

test("duplicate categories are collapsed and unrelated values dropped", () => {
  const result = normaliseWorkflowSettings({ categories: ["TOPCon", "TOPCon", "HJT", "nonsense"] });
  assert.deepEqual(result.value.categories, ["TOPCon", "HJT"]);
});

test("completed drafts are never regenerated; failed slots are retried", () => {
  const existing = [
    { dailySequence: 1, status: "completed" },
    { dailySequence: 2, status: "failed" },
    { dailySequence: 3, status: "generating" },
  ];
  const plan = planDailySequences(existing, 3);
  assert.deepEqual(plan.plan, [2]);
  assert.equal(plan.becauseTargetReached, false);
});

test("a finished day reports the target as reached", () => {
  const plan = planDailySequences([{ dailySequence: 1, status: "completed" }, { dailySequence: 2, status: "completed" }], 2);
  assert.deepEqual(plan.plan, []);
  assert.equal(plan.becauseTargetReached, true);
});

test("each sequence draws a different category before repeating", () => {
  const categories = ["TOPCon", "HJT", "Bifacial Modules"];
  assert.deepEqual([1, 2, 3, 4].map(sequence => categoryForSequence(categories, sequence)), [
    "TOPCon",
    "HJT",
    "Bifacial Modules",
    "TOPCon",
  ]);
  assert.equal(categoryForSequence([], 2), "Festival Campaign");
});
