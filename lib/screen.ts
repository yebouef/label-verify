// Batch screening: when importers dump hundreds of labels at once, an
// agent's first pass is triage — which labels have an obvious problem
// and need a close look. We don't have per-label application data in
// that scenario, so we run the self-contained checks that don't need
// it: the mandatory Government Warning, presence of required fields,
// and image legibility. This surfaces the likely-problem labels so the
// agent spends their time where it matters.

import type { ExtractedLabel, FieldCheck, Verdict } from "./types";
import { checkWarning } from "./warning";

export interface ScreenResult {
  verdict: Verdict;
  checks: FieldCheck[];
  legibility: ExtractedLabel["legibility"];
  summary: string;
  extracted: ExtractedLabel;
}

function presence(field: string, label: string, value: string | null): FieldCheck {
  const present = !!value && value.trim().length > 0;
  return {
    field,
    label,
    applicationValue: "Required on label",
    labelValue: value ?? "(not found)",
    status: present ? "pass" : "fail",
    message: present ? `${label} is present.` : `${label} is missing from the label.`,
  };
}

export function screenLabel(label: ExtractedLabel): ScreenResult {
  const checks: FieldCheck[] = [
    presence("brandName", "Brand Name", label.brandName),
    presence("classType", "Class / Type", label.classType),
    presence("netContents", "Net Contents", label.netContents),
  ];

  const w = checkWarning(
    label.governmentWarning,
    label.governmentWarningIsAllCaps,
    label.governmentWarningIsBold,
  );
  checks.push({
    field: "governmentWarning",
    label: "Government Warning",
    applicationValue: "Required, verbatim",
    labelValue: label.governmentWarning ?? "(not found)",
    status: w.status,
    message: w.message,
  });

  let verdict: Verdict = checks.some((c) => c.status === "fail")
    ? "reject"
    : checks.some((c) => c.status === "warning")
      ? "review"
      : "approve";

  let summary: string;
  if (label.legibility === "unreadable") {
    verdict = "review";
    summary = "Image could not be read clearly — request a better photo.";
  } else if (verdict === "approve") {
    summary = "Required elements present; warning matches. Ready for standard field review.";
  } else if (verdict === "reject") {
    summary = "Missing required element(s) or non-compliant warning. Flag for the agent.";
  } else {
    summary = "Needs a human look.";
  }

  return { verdict, checks, legibility: label.legibility, summary, extracted: label };
}
