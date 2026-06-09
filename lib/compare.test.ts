import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeText, parseAbv, parseVolumeMl, verifyLabel } from "./compare.ts";
import { checkWarning, REQUIRED_WARNING } from "./warning.ts";
import type { ApplicationData, ExtractedLabel } from "./types.ts";

const baseApp: ApplicationData = {
  brandName: "Old Tom Distillery",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  beverageType: "spirits",
};

const goodLabel: ExtractedLabel = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  governmentWarning: REQUIRED_WARNING,
  governmentWarningIsAllCaps: true,
  governmentWarningIsBold: true,
  legibility: "clear",
  notes: null,
};

test("normalizeText folds case and punctuation (Dave's STONE'S THROW case)", () => {
  assert.equal(normalizeText("STONE'S THROW"), normalizeText("Stone's Throw"));
});

test("parseAbv reads percent, alc/vol, proof, and bare numbers", () => {
  assert.equal(parseAbv("45% Alc./Vol. (90 Proof)"), 45);
  assert.equal(parseAbv("90 Proof"), 45);
  assert.equal(parseAbv("45"), 45);
  assert.equal(parseAbv("13.5% ABV"), 13.5);
});

test("parseVolumeMl converts liters to ml", () => {
  assert.equal(parseVolumeMl("750 mL"), 750);
  assert.equal(parseVolumeMl("1.75 L"), 1750);
});

test("clean label with matching fields approves", () => {
  const r = verifyLabel(baseApp, goodLabel);
  assert.equal(r.verdict, "approve");
});

test("case-only brand difference still approves", () => {
  const r = verifyLabel(
    { ...baseApp, brandName: "Stone's Throw" },
    { ...goodLabel, brandName: "STONE'S THROW", classType: baseApp.classType },
  );
  assert.equal(r.checks.find((c) => c.field === "brandName")!.status, "pass");
});

test("ABV mismatch rejects", () => {
  const r = verifyLabel(baseApp, { ...goodLabel, alcoholContent: "40% Alc./Vol." });
  assert.equal(r.verdict, "reject");
});

test("missing warning rejects", () => {
  const r = verifyLabel(baseApp, { ...goodLabel, governmentWarning: null });
  assert.equal(r.verdict, "reject");
});

test("title-case warning header fails (Jenny's catch)", () => {
  const res = checkWarning(REQUIRED_WARNING, false, true);
  assert.equal(res.status, "fail");
});

test("non-bold warning header fails", () => {
  const res = checkWarning(REQUIRED_WARNING, true, false);
  assert.equal(res.status, "fail");
});

test("unconfirmable bold routes to soft warning, not fail", () => {
  const res = checkWarning(REQUIRED_WARNING, true, null);
  assert.equal(res.status, "warning");
});

test("altered warning wording fails", () => {
  const bad = REQUIRED_WARNING.replace("birth defects", "birth problems");
  const res = checkWarning(bad, true, true);
  assert.equal(res.status, "fail");
});

test("unreadable image routes to review, not auto-reject", () => {
  const r = verifyLabel(baseApp, { ...goodLabel, legibility: "unreadable" });
  assert.equal(r.verdict, "review");
});

test("class/type superset warns rather than fails", () => {
  const r = verifyLabel(
    { ...baseApp, classType: "Bourbon Whiskey" },
    goodLabel,
  );
  assert.equal(r.checks.find((c) => c.field === "classType")!.status, "warning");
});
