// The federal Government Warning Statement, mandated verbatim by
// 27 CFR 16.21. The text must appear exactly; "GOVERNMENT WARNING:"
// must be in all caps and bold. We validate the wording here and the
// caps/bold rendering separately (bold can't be read reliably from a
// flat image, so we surface it as a manual-review flag).

export const REQUIRED_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

/** Collapse whitespace and punctuation noise so OCR spacing quirks
 *  don't cause false mismatches, while keeping wording intact. */
function canonical(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .trim();
}

export interface WarningCheckResult {
  status: "pass" | "warning" | "fail";
  message: string;
}

export function checkWarning(
  printed: string | null,
  isAllCaps: boolean | null,
  isBold: boolean | null = null,
): WarningCheckResult {
  if (!printed || printed.trim().length === 0) {
    return {
      status: "fail",
      message:
        "No Government Warning statement found on the label. This is mandatory on all alcohol beverages (27 CFR 16.21).",
    };
  }

  const got = canonical(printed);
  const want = canonical(REQUIRED_WARNING);

  // Wording must match exactly (case-insensitive for wording; the caps
  // requirement applies only to the "GOVERNMENT WARNING:" header).
  if (got.toLowerCase() !== want.toLowerCase()) {
    return {
      status: "fail",
      message:
        "Government Warning wording does not match the federally mandated text exactly. The statement must be reproduced verbatim.",
    };
  }

  // Header must be all caps (27 CFR 16.21).
  if (isAllCaps === false) {
    return {
      status: "fail",
      message:
        '"GOVERNMENT WARNING:" must appear in all capital letters. It was not detected in all caps on this label.',
    };
  }

  // Header must be bold (27 CFR 16.21).
  if (isBold === false) {
    return {
      status: "fail",
      message:
        '"GOVERNMENT WARNING:" must appear in bold type. The header was not detected in bold on this label.',
    };
  }

  // Wording and caps are confirmed, but the image couldn't confirm bold.
  if (isBold === null) {
    return {
      status: "warning",
      message:
        'Wording and all-caps are confirmed, but bold rendering of "GOVERNMENT WARNING:" could not be judged from the image. Confirm the header is bold manually.',
    };
  }

  if (isAllCaps === null) {
    return {
      status: "warning",
      message:
        'Warning wording matches, but the all-caps rendering of "GOVERNMENT WARNING:" could not be confirmed from the image. Confirm manually.',
    };
  }

  return {
    status: "pass",
    message:
      "Government Warning statement is present, verbatim, and the header is bold and all-caps.",
  };
}
