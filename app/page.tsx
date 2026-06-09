"use client";

import { useState } from "react";
import { SingleView } from "./components/SingleView";
import { BatchView } from "./components/BatchView";

export default function Home() {
  const [tab, setTab] = useState<"single" | "batch">("single");
  return (
    <>
      <header className="app">
        <h1>Label Verification</h1>
        <p>Check alcohol beverage labels against application data — TTB compliance prototype</p>
      </header>
      <main>
        <div className="tabs" role="tablist" aria-label="Mode">
          <button
            className="tab"
            role="tab"
            aria-selected={tab === "single"}
            onClick={() => setTab("single")}
          >
            Single label
          </button>
          <button
            className="tab"
            role="tab"
            aria-selected={tab === "batch"}
            onClick={() => setTab("batch")}
          >
            Batch upload
          </button>
        </div>

        {tab === "single" ? <SingleView /> : <BatchView />}

        <p className="meta">
          Prototype for evaluation only. Decisions are advisory and intended to assist, not replace,
          agent review. No images or application data are stored.
        </p>
      </main>
    </>
  );
}
