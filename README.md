# Label Verification

A prototype that helps TTB compliance agents verify alcohol beverage labels against the data in a COLA application. An agent enters the application fields, uploads the label artwork, and the tool reads the label, compares each field, and returns a clear **approve / review / reject** recommendation in a few seconds. A batch mode screens hundreds of labels at once and flags the problem ones.

> Prototype for evaluation. Recommendations are advisory and meant to assist agent review, not replace it. No images or application data are persisted.

## What it checks

For a single label, against the application:

- **Brand name** — case- and punctuation-insensitive, so `STONE'S THROW` matches `Stone's Throw`.
- **Class / type** — exact match passes; a label that adds descriptors (`Kentucky Straight Bourbon Whiskey` vs an application's `Bourbon Whiskey`) is flagged for review rather than failed.
- **Alcohol content** — parsed numerically with a small tolerance; proof is reconciled to ABV (`90 Proof` → `45%`).
- **Net contents** — normalized to milliliters (`1.75 L` → `1750 mL`).
- **Government Warning** — held to the exact federal text (27 CFR 16.21). Altered wording, a missing statement, or a `GOVERNMENT WARNING:` header that isn't **all-caps and bold** all fail. When the image genuinely can't resolve bold, it routes to a soft "confirm manually" warning rather than a false pass.

If the image is unreadable, the tool routes to **review** and asks for a better photo instead of guessing.

## How it works

```
Browser (Next.js UI)
   │  application fields + image
   ▼
/api/verify  ──►  extract.ts  ──►  Claude vision (structured extraction, read-only)
   │                                   │ returns label fields verbatim
   ▼                                   ▼
compare.ts (deterministic field comparison)  ──►  approve / review / reject
```

The model's only job is to **read** the label and return its fields verbatim via a structured tool call. Every accept/reject decision is made by deterministic, unit-tested code in `lib/compare.ts` and `lib/warning.ts`. This keeps the compliance logic auditable — you can read exactly why a label passed or failed — and keeps the model from "helpfully" correcting a mismatch that an agent needs to see.

Batch mode (`/api/screen`) runs the self-contained checks that don't need per-label application data — Government Warning, presence of required fields, legibility — so a 200-label importer dump can be triaged down to the handful that need a close look.

## Project layout

```
app/
  page.tsx                  Tabbed UI: single label / batch
  api/verify/route.ts       Single-label verification endpoint
  api/screen/route.ts       Batch screening endpoint (one image per call)
  components/               Form, dropzone, result, batch table
lib/
  types.ts                  Shared types
  extract.ts                Claude vision extraction (read-only)
  compare.ts                Field comparison + verdict logic
  warning.ts                Federal Government Warning validation
  screen.ts                 Application-free batch screening
  compare.test.ts           Unit tests for the comparison logic
```

## Setup and run

Requires Node 18.18+ (developed on Node 22).

```bash
npm install
cp .env.example .env.local      # then add your Anthropic API key
npm run dev                     # http://localhost:3000
```

Set `ANTHROPIC_API_KEY` in `.env.local`. The extraction model defaults to `claude-haiku-4-5` for low latency; override with `ANTHROPIC_MODEL` if you want higher accuracy on difficult images.

### Tests

```bash
npm test
```

Covers normalization (the `STONE'S THROW` case), ABV/proof and volume parsing, the exact Government Warning rules (including the title‑case header catch), and the unreadable-image path.

### Production build

```bash
npm run build && npm start
```

## Deploy (Vercel)

1. Push this folder to a GitHub repo.
2. In Vercel, **Add New → Project** and import the repo.
3. Add an environment variable `ANTHROPIC_API_KEY` with your key.
4. Deploy. Vercel auto-detects Next.js; no other configuration is needed.

The API routes run on the Node.js runtime as serverless functions, so the key stays server-side and is never exposed to the browser.

## Approach, decisions, and assumptions

**Why a thin model role.** Compliance review has to be explainable. By restricting the model to verbatim extraction and doing all judgment in code, every verdict traces to a specific, testable rule. It also means the warning check can be genuinely exact, which the agents asked for.

**Why these tolerances.** The interviews made clear that agents already apply judgment to trivial differences (Dave's `STONE'S THROW`). The comparison mirrors that: cosmetic differences pass, a superset class/type is flagged not failed, and only substantive mismatches fail. The goal is to remove the rote matching, not to add false rejections agents have to override.

**Why a three-state verdict.** A binary pass/fail would force the tool to take positions it shouldn't (e.g. on a beer exempt from stating ABV, or a label photographed at a bad angle). `review` keeps a human in the loop exactly where judgment is needed.

**Latency.** The single-label path is one vision call plus local comparison, which lands within the ~5-second target the team set after the prior vendor pilot. Batch fans out across images with capped concurrency so each individual response stays fast and results stream in as they complete.

**Accessibility / usability.** Large touch targets, high-contrast status colors paired with text labels (not color alone), keyboard-operable dropzones, `aria-live` result regions, and plain-language verdicts — aimed at the "clean, obvious, no hunting for buttons" benchmark and a team where half the agents are over 50.

### AI prompts used

The model is given a tightly scoped, read-only role. The system prompt is:

> You are a meticulous OCR and data-extraction assistant for alcohol beverage label review. You read what is printed on a label image and return it verbatim. You never guess, never correct spelling, and never normalize wording. If a field is not visible, return null for it. Report exactly what the label says, including the full Government Warning text as printed.

The user turn sends the image plus: *"Read this alcohol beverage label and report its fields. Transcribe the Government Warning verbatim if present."*

Rather than free-form text, the model must return its answer through a **forced tool call** (`report_label_fields`) whose schema requires each field (brand, class/type, alcohol content, net contents, the verbatim warning, whether the header is all-caps, whether it is bold, overall legibility, and image-quality notes). Forcing structured output makes the extraction deterministic to parse, prevents the model from editorializing, and keeps it from making the pass/fail decision — that lives in code. Full schema is in `lib/extract.ts`.

### Assumptions

- This is a standalone proof-of-concept; no COLA integration, no persistence, no auth — matching the stated prototype scope.
- The federal Government Warning text is treated as the single required standard (27 CFR 16.21).
- One label image represents one product; multi-panel artwork (front/back as separate files) is out of scope for this prototype.
- Bold detection relies on the vision model's read of relative stroke weight; when it can't be judged confidently the check degrades to a manual-confirm warning rather than a false pass or fail.
- Cloud API access (Anthropic) is assumed available for the deployed prototype. In TTB's actual firewalled network this would need an approved egress path or an on-prem vision model — noted as a known constraint, not solved here.

### Known limitations / trade-offs

- Extraction quality depends on image quality; very low-resolution or heavily obscured labels are routed to review rather than force-read.
- Batch mode screens for self-contained issues only; pairing each label with its application record (e.g. via a filename-keyed CSV) would be the next step.
- Class/type matching uses substring heuristics; a full TTB class/type taxonomy would make it stricter.
