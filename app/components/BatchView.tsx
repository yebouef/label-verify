"use client";

import { useRef, useState } from "react";
import type { BatchItemResult } from "@/lib/types";

const VERDICT_PILL: Record<string, string> = {
  approve: "Pass",
  review: "Review",
  reject: "Flag",
};

// Cap concurrency so we don't open hundreds of sockets at once on a big
// importer batch, while still processing several labels in parallel.
const CONCURRENCY = 4;

export function BatchView() {
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<BatchItemResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs]);
    setRows([]);
  }

  async function screenOne(file: File): Promise<BatchItemResult> {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/screen", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) return { filename: file.name, ok: false, error: data.error ?? "Failed." };
      return { filename: file.name, ok: true, result: data };
    } catch (e) {
      return { filename: file.name, ok: false, error: e instanceof Error ? e.message : "Failed." };
    }
  }

  async function run() {
    if (files.length === 0) return;
    setBusy(true);
    setDone(0);
    setRows([]);
    const queue = [...files];
    const collected: BatchItemResult[] = [];

    async function worker() {
      while (queue.length) {
        const f = queue.shift()!;
        const r = await screenOne(f);
        collected.push(r);
        setRows([...collected]);
        setDone((d) => d + 1);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
    setBusy(false);
  }

  const counts = rows.reduce(
    (acc, r) => {
      const v = r.ok ? r.result!.verdict : "error";
      acc[v] = (acc[v] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
      <section className="panel">
        <h2>Batch screening</h2>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          Upload many labels at once. Each is screened for the mandatory Government Warning,
          required fields, and image quality, then flagged so agents look at the problem ones first.
        </p>
        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <strong>Click to choose</strong> or drag a folder of label images here
          <p>{files.length > 0 ? `${files.length} image${files.length === 1 ? "" : "s"} ready` : "JPEG, PNG, or WebP"}</p>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </div>
        <button className="primary" onClick={run} disabled={busy || files.length === 0}>
          {busy ? `Screening… ${done}/${files.length}` : `Screen ${files.length || ""} label${files.length === 1 ? "" : "s"}`}
        </button>
      </section>

      {rows.length > 0 ? (
        <section className="panel">
          <h2>Results</h2>
          <p className="chips">
            {counts.approve ? <span className="pill approve">{counts.approve} Pass</span> : null}{" "}
            {counts.review ? <span className="pill review">{counts.review} Review</span> : null}{" "}
            {counts.reject ? <span className="pill reject">{counts.reject} Flag</span> : null}{" "}
            {counts.error ? <span className="pill error">{counts.error} Error</span> : null}
          </p>
          <table className="batch">
            <thead>
              <tr>
                <th>File</th>
                <th>Status</th>
                <th>Brand</th>
                <th>Warning</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                if (!r.ok) {
                  return (
                    <tr key={i}>
                      <td>{r.filename}</td>
                      <td><span className="pill error">Error</span></td>
                      <td colSpan={3}>{r.error}</td>
                    </tr>
                  );
                }
                const res = r.result!;
                const warn = res.checks.find((c) => c.field === "governmentWarning");
                return (
                  <tr key={i}>
                    <td>{r.filename}</td>
                    <td><span className={`pill ${res.verdict}`}>{VERDICT_PILL[res.verdict]}</span></td>
                    <td>{res.extracted.brandName ?? "—"}</td>
                    <td>{warn?.status === "pass" ? "OK" : warn?.status === "warning" ? "Check" : "Problem"}</td>
                    <td>{res.summary}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
