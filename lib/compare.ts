// Field-by-field comparison between the COLA application data and what
// the vision model read off the label image.
//
// Design notes (informed by the stakeholder interviews):
//  - Dave's "STONE'S THROW" vs "Stone's Throw" case: comparisons are
//    case-insensitive and punctuation/whitespace-normalized so trivial
//    cosmetic differences pass, while real differences fail.
//  - ABV is compared numerically with a small tolerance and proof is
//    derived (proof = 2 x ABV) so "45% (90 proof)" reconciles cleanly.
//  - The Government Warning is checked separately (see warning.ts) and
//    held to an exact standard, per Jenny.

import type {
  ApplicationData,
  ExtractedLabel,
  FieldCheck,
  VerificationResult,
  Verdict,
} from "./types";
import { checkWarning } from "./warning";

/** Lowercase, strip accents, collapse whitespace, drop punctuation that
 *  doesn't change meaning. Keeps alphanumerics and spaces. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "'") // unify apostrophes, then drop below
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull the first ABV percentage out of a free-form string. Falls back
 *  to deriving ABV from a stated proof if no percentage is present. */
export function parseAbv(value: string): number | null {
  if (!value) return null;
  const pct = value.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return parseFloat(pct[1]);
  const alcVol = value.match(/(\d+(?:\.\d+)?)\s*(?:alc|abv)/i);
  if (alcVol) return parseFloat(alcVol[1]);
  const proof = value.match(/(\d+(?:\.\d+)?)\s*proof/i);
  if (proof) return parseFloat(proof[1]) / 2;
  // Bare number, e.g. an application that just says "45"
  const bare = value.trim().match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return parseFloat(bare[1]);
  return null;
}

/** Normalize a net-contents string to milliliters for comparison. */
export function parseVolumeMl(value: string): number | null {
  if (!value) return null;
  const m = value.match(/(\d+(?:\.\d+)?)\s*(ml|milliliter|l|liter|litre)/i);
  if (m) {
    const n = parseFloat(m[1]);
    const unit = m[2].toLowerCase();
    return unit.startsWith("l") ? n * 1000 : n;
  }
  return null;
}

function compareBrand(app: ApplicationData, label: ExtractedLabel): FieldCheck {
  const base = {
    field: "brandName",
    label: "Brand Name",
    applicationValue: app.brandName,
    labelValue: label.brandName ?? "(not found)",
  };
  if (!label.brandName) {
    return { ...base, status: "fail", message: "Brand name not found on the label." };
  }
  if (normalizeText(app.brandName) === normalizeText(label.brandName)) {
    return { ...base, status: "pass", message: "Brand name matches." };
  }
  return {
    ...base,
    status: "fail",
    message: "Brand name on the label does not match the application.",
  };
}

function compareClassType(app: ApplicationData, label: ExtractedLabel): FieldCheck {
  const base = {
    field: "classType",
    label: "Class / Type",
    applicationValue: app.classType,
    labelValue: label.classType ?? "(not found)",
  };
  if (!app.classType?.trim()) {
    return { ...base, status: "warning", message: "No class/type provided in the application to compare against." };
  }
  if (!label.classType) {
    return { ...base, status: "fail", message: "Class/type designation not found on the label." };
  }
  const a = normalizeText(app.classType);
  const l = normalizeText(label.classType);
  if (a === l) {
    return { ...base, status: "pass", message: "Class/type matches." };
  }
  // Substring tolerance: labels often carry extra descriptors
  // ("Kentucky Straight Bourbon Whiskey" vs "Bourbon Whiskey").
  if (l.includes(a) || a.includes(l)) {
    return {
      ...base,
      status: "warning",
      message: "Class/type is similar but not identical. Confirm the designation manually.",
    };
  }
  return { ...base, status: "fail", message: "Class/type on the label does not match the application." };
}

function compareAbv(app: ApplicationData, label: ExtractedLabel): FieldCheck {
  const base = {
    field: "alcoholContent",
    label: "Alcohol Content",
    applicationValue: app.alcoholContent,
    labelValue: label.alcoholContent ?? "(not found)",
  };
  const appAbv = parseAbv(app.alcoholContent);
  const labelAbv = parseAbv(label.alcoholContent ?? "");

  if (labelAbv === null) {
    // Certain beers/wines are exempt from stating ABV; flag rather than fail.
    return {
      ...base,
      status: "warning",
      message:
        "Alcohol content could not be read from the label. Some beer/wine classes are exempt; confirm manually.",
    };
  }
  if (appAbv === null) {
    return { ...base, status: "warning", message: "Alcohol content in the application could not be parsed." };
  }
  if (Math.abs(appAbv - labelAbv) <= 0.1) {
    return { ...base, status: "pass", message: `Alcohol content matches (${labelAbv}% ABV).` };
  }
  return {
    ...base,
    status: "fail",
    message: `Alcohol content mismatch: application ${appAbv}% vs label ${labelAbv}%.`,
  };
}

function compareNetContents(app: ApplicationData, label: ExtractedLabel): FieldCheck {
  const base = {
    field: "netContents",
    label: "Net Contents",
    applicationValue: app.netContents,
    labelValue: label.netContents ?? "(not found)",
  };
  if (!app.netContents?.trim()) {
    return { ...base, status: "warning", message: "No net contents provided in the application to compare against." };
  }
  if (!label.netContents) {
    return { ...base, status: "fail", message: "Net contents not found on the label." };
  }
  const a = parseVolumeMl(app.netContents);
  const l = parseVolumeMl(label.netContents);
  if (a !== null && l !== null) {
    if (a === l) return { ...base, status: "pass", message: `Net contents match (${l} mL).` };
    return { ...base, status: "fail", message: `Net contents mismatch: application ${a} mL vs label ${l} mL.` };
  }
  // Fall back to text comparison if units couldn't be parsed.
  if (normalizeText(app.netContents) === normalizeText(label.netContents)) {
    return { ...base, status: "pass", message: "Net contents match." };
  }
  return { ...base, status: "fail", message: "Net contents do not match." };
}

function rollUp(checks: FieldCheck[]): Verdict {
  if (checks.some((c) => c.status === "fail")) return "reject";
  if (checks.some((c) => c.status === "warning")) return "review";
  return "approve";
}

export function verifyLabel(
  app: ApplicationData,
  label: ExtractedLabel,
): VerificationResult {
  const checks: FieldCheck[] = [
    compareBrand(app, label),
    compareClassType(app, label),
    compareAbv(app, label),
    compareNetContents(app, label),
  ];

  const warning = checkWarning(
    label.governmentWarning,
    label.governmentWarningIsAllCaps,
    label.governmentWarningIsBold,
  );
  checks.push({
    field: "governmentWarning",
    label: "Government Warning",
    applicationValue: "Required, verbatim",
    labelValue: label.governmentWarning ?? "(not found)",
    status: warning.status,
    message: warning.message,
  });

  // If the image was unreadable, the comparison isn't trustworthy.
  let verdict = rollUp(checks);
  let summary: string;
  if (label.legibility === "unreadable") {
    verdict = "review";
    summary =
      "The label image could not be read clearly. Request a higher-quality image before deciding.";
  } else {
    const failed = checks.filter((c) => c.status === "fail").length;
    const flagged = checks.filter((c) => c.status === "warning").length;
    if (verdict === "approve") {
      summary = "All checks passed. The label matches the application and required elements are present.";
    } else if (verdict === "reject") {
      summary = `${failed} field${failed === 1 ? "" : "s"} failed verification. Recommend rejection or correction.`;
    } else {
      summary = `${flagged} field${flagged === 1 ? "" : "s"} need a human look before approval.`;
    }
  }

  return {
    verdict,
    checks,
    extracted: label,
    legibility: label.legibility,
    summary,
  };
}
