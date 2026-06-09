import type { VerificationResult } from "@/lib/types";

const VERDICT_LABEL: Record<string, string> = {
  approve: "Ready to approve",
  review: "Needs a human look",
  reject: "Recommend rejection",
};

const VERDICT_ICON: Record<string, string> = {
  approve: "✓", // check
  review: "!",
  reject: "✕", // x
};

const CHECK_ICON: Record<string, string> = {
  pass: "✓",
  warning: "!",
  fail: "✕",
};

export function ResultView({ result }: { result: VerificationResult }) {
  return (
    <div>
      <div className={`verdict ${result.verdict}`} role="status">
        <span className="icon" aria-hidden>{VERDICT_ICON[result.verdict]}</span>
        <div>
          <div className="title">{VERDICT_LABEL[result.verdict]}</div>
          <div className="summary">{result.summary}</div>
        </div>
      </div>

      {result.checks.map((c) => (
        <div key={c.field} className={`check ${c.status}`}>
          <span className="badge" aria-hidden>{CHECK_ICON[c.status]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span className="name">{c.label}</span>
              <span className="status-word">{c.status === "pass" ? "Match" : c.status === "warning" ? "Check" : "Problem"}</span>
            </div>
            <div className="vals">
              <span className="v">Application: <code>{c.applicationValue || "—"}</code></span>
              {"  "}
              <span className="v">Label: <code>{c.labelValue || "—"}</code></span>
            </div>
            <div className="msg">{c.message}</div>
          </div>
        </div>
      ))}

      {result.extracted.notes ? (
        <p className="meta">Image notes: {result.extracted.notes}</p>
      ) : null}
    </div>
  );
}
