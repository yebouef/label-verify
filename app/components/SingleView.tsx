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
  const resultRef = useRef<HTMLDivElement>(null);

  function pick(f: File | null) {
    setResult(null);
    setError(null);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!app.brandName.trim()) return setError("Please enter the brand name in Step 1.");
    if (!file) return setError("Please add a label photo in Step 2.");
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      Object.entries(app).forEach(([k, v]) => fd.append(k, v));
      fd.append("image", file);
      const res = await fetch("/api/verify", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setResult(data as VerificationResult);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setApp(EMPTY);
    pick(null);
  }

  return (
    <div>
      <section className="step">
        <div className="step-head">
          <span className="step-num">1</span>
          <div>
            <h2>Enter the application details</h2>
            <p className="hint">What the applicant submitted on their COLA form.</p>
          </div>
        </div>
        <ApplicationFields value={app} onChange={setApp} />
      </section>

      <section className="step">
        <div className="step-head">
          <span className="step-num">2</span>
          <div>
            <h2>Add the label photo</h2>
            <p className="hint">The artwork that will go on the bottle.</p>
          </div>
        </div>
        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Choose or drop a label image"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0] ?? null); }}
        >
          <div className="big">Click to choose a photo</div>
          <p>or drag it here — JPEG, PNG, or WebP</p>
          {file ? <div className="filechip">Selected: {file.name}</div> : null}
          {preview ? <img className="preview" src={preview} alt="Label preview" /> : null}
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </div>
      </section>

      <section className="step">
        <div className="step-head">
          <span className="step-num">3</span>
          <div>
            <h2>Check the label</h2>
            <p className="hint">We read the photo and compare it to Step 1.</p>
          </div>
        </div>
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? "Checking the label…" : "Check this label"}
        </button>
        {busy ? <p className="spinner-note">Reading the photo and comparing each field…</p> : null}

        <div ref={resultRef} aria-live="polite" style={{ marginTop: error || result ? 22 : 0 }}>
          {error ? (
            <div className="alert" role="alert">
              <span className="badge" aria-hidden>!</span>
              <span>{error}</span>
            </div>
          ) : null}
          {result ? (
            <>
              <ResultView result={result} />
              <button className="ghost" onClick={reset} style={{ marginTop: 14 }}>
                Check another label
              </button>
            </>
          ) : !error ? (
            <p className="empty">Your result will appear here.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
