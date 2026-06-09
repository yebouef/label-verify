"use client";

import { useRef, useState } from "react";
import type { ApplicationData, VerificationResult } from "@/lib/types";
import { ApplicationFields } from "./ApplicationFields";
import { ResultView } from "./ResultView";

const EMPTY: ApplicationData = {
  brandName: "",
  classType: "",
  alcoholContent: "",
  netContents: "",
  beverageType: "spirits",
};

export function SingleView() {
  const [app, setApp] = useState<ApplicationData>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function pick(f: File | null) {
    setResult(null);
    setError(null);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!app.brandName.trim()) return setError("Enter the brand name from the application.");
    if (!file) return setError("Add a label image to check.");
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      Object.entries(app).forEach(([k, v]) => fd.append(k, v));
      fd.append("image", file);
      const res = await fetch("/api/verify", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Verification failed.");
      setResult(data as VerificationResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <section className="panel">
        <h2>1. Application data</h2>
        <ApplicationFields value={app} onChange={setApp} />

        <h2 style={{ marginTop: 8 }}>2. Label image</h2>
        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0] ?? null); }}
        >
          <strong>Click to choose</strong> or drag a label image here
          <p>JPEG, PNG, or WebP</p>
          {preview ? <img className="preview" src={preview} alt="Selected label preview" /> : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? "Checking label…" : "Verify label"}
        </button>
        {busy ? <p className="spinner-note">Reading the label and comparing fields…</p> : null}
      </section>

      <section className="panel" aria-live="polite">
        <h2>Result</h2>
        {error ? <div className="alert" role="alert">{error}</div> : null}
        {result ? (
          <ResultView result={result} />
        ) : !error ? (
          <p className="empty">Results will appear here after you verify a label.</p>
        ) : null}
      </section>
    </div>
  );
}
