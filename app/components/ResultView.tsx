import type { VerificationResult } from "@/lib/types";

const VERDICT_LABEL: Record<string, string> = {
  approve: "Ready to approve",
  review: "Needs human review",
  reject: "Recommend rejection",
};

export function ResultView({ result }: { result: VerificationResult }) {
  return (
    <div>
      <div className={`verdict ${result.verdict}`} role="status">
        <span className="dot" aria-hidden />
        <div>
          <div>{VERDICT_LABEL[result.verdict]}</div>
          <div className="summary">{result.summary}</div>
        </div>
      </div>

      {result.checks.map((c) => (
        <div key={c.field} className={`check ${c.status}`}>
          <div className="row">
            <span className="name">{c.label}</span>
            <span className="status">{c.status}</span>
          </div>
          <div className="vals">
            Application: <code>{c.applicationValue || "—"}</code>{" "}
            &nbsp;Label: <code>{c.labelValue || "—"}</code>
          </div>
          <div className="msg">{c.message}</div>
        </div>
      ))}

      {result.extracted.notes ? (
        <p className="meta">Image notes: {result.extracted.notes}</p>
      ) : null}
    </div>
  );
}
