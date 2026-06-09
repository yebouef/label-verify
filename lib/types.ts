// Shared types for the label verification flow.

export type BeverageType = "spirits" | "wine" | "beer";

/** The fields an agent enters from the COLA application. */
export interface ApplicationData {
  brandName: string;
  classType: string;
  alcoholContent: string; // e.g. "45% Alc./Vol. (90 Proof)" or "45"
  netContents: string; // e.g. "750 mL"
  beverageType: BeverageType;
}

/** Fields extracted from the label image by the vision model. */
export interface ExtractedLabel {
  brandName: string | null;
  classType: string | null;
  alcoholContent: string | null;
  netContents: string | null;
  governmentWarning: string | null; // verbatim, as printed
  governmentWarningIsAllCaps: boolean | null;
  governmentWarningIsBold: boolean | null;
  legibility: "clear" | "partial" | "unreadable";
  notes: string | null; // model observations: glare, angle, etc.
}

export type CheckStatus = "pass" | "warning" | "fail";

export interface FieldCheck {
  field: string;
  label: string; // human-readable field name
  applicationValue: string;
  labelValue: string;
  status: CheckStatus;
  message: string;
}

export type Verdict = "approve" | "review" | "reject";

export interface VerificationResult {
  verdict: Verdict;
  checks: FieldCheck[];
  extracted: ExtractedLabel;
  legibility: ExtractedLabel["legibility"];
  summary: string;
}

export interface BatchItemResult {
  filename: string;
  ok: boolean;
  error?: string;
  result?: VerificationResult;
}
