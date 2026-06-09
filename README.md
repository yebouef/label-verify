# Label Verification

I built this prototype to help TTB compliance agents verify alcohol beverage labels against the data in a COLA application. The agent enters the application fields, uploads the label artwork, and the tool reads the label, compares each field, and gives back a clear **approve / review / reject** call in a few seconds. I also added a batch mode that screens hundreds of labels at once and flags the problem ones, which came directly out of the interview note about importers dumping 200–300 applications at a time.

> This is a prototype for evaluation. The recommendations are advisory — I designed it to assist an agent's review, not replace it. Nothing is persisted; images and application data live only for the length of a request.

## What it checks

For a single label, against the application:

- **Brand name** — I compare this case- and punctuation-insensitive, so `STONE'S THROW` matches `Stone's Throw`. That was Dave's example, and I didn't want the tool flagging something a human would obviously read as the same thing.
- **Class / type** — an exact match passes; if the label adds descriptors (`Kentucky Straight Bourbon Whiskey` vs an application's `Bourbon Whiskey`) I flag it for review rather than fail it.
- **Alcohol content** — I parse this numerically with a small tolerance, and reconcile proof to ABV (`90 Proof` → `45%`).
- **Net contents** — normalized to milliliters (`1.75 L` → `1750 mL`) before comparing.
- **Government Warning** — this is the one place I made the logic strict. I hold it to the exact federal text (27 CFR 16.21). Altered wording, a missing statement, or a `GOVERNMENT WARNING:` header that isn't all-caps and bold all fail. When the image genuinely can't resolve whether the header is bold, I route it to a soft "confirm manually" warning instead of letting it pass silently.

If the image itself is unreadable, I route to **review** and ask for a better photo rather than guessing — Jenny mentioned agents already reject and re-request bad images, so I kept that behavior.

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

The decision I'm most deliberate about: the model's only job is to **read** the label and return its fields verbatim through a structured tool call. Every accept/reject decision is made by deterministic, unit-tested code in `lib/compare.ts` and `lib/warning.ts`. I did it this way so the compliance logic stays auditable — you can read exactly why a label passed or failed — and so the model can't "helpfully" correct a mismatch that an agent actually needs to see.

Batch mode (`/api/screen`) runs the self-contained checks that don't need per-label application data — Government Warning, presence of required fields, legibility — so a 200-label importer dump gets triaged down to the handful that need a close look.

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

Requires Node 18.18+ (I developed on Node 22).

```bash
npm install
cp .env.example .env.local      # then add your Anthropic API key
npm run dev                     # http://localhost:3000
```

Set `ANTHROPIC_API_KEY` in `.env.local`. I default the extraction model to `claude-haiku-4-5` for low latency; you can override it with `ANTHROPIC_MODEL` if you want higher accuracy on difficult images.

### Tests

```bash
npm test
```

These cover the parts I cared most about getting right: normalization (the `STONE'S THROW` case), ABV/proof and volume parsing, the exact Government Warning rules (including the title-case and non-bold header catches), and the unreadable-image path.

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

## My approach and the decisions I made

**Why I kept the model's role thin.** Compliance review has to be explainable. By restricting the model to verbatim extraction and doing all the judgment in code, every verdict traces to a specific, testable rule. It also let me make the warning check genuinely exact, which is what the agents asked for.

**Why these tolerances.** The interviews made it clear that agents already apply judgment to trivial differences. I mirrored that: cosmetic differences pass, a superset class/type is flagged rather than failed, and only substantive mismatches fail. My goal was to remove the rote matching without adding false rejections that agents then have to override.

**Why a three-state verdict.** A binary pass/fail would force the tool to take positions it shouldn't — on a beer exempt from stating ABV, say, or a label shot at a bad angle. The `review` state keeps a human in the loop exactly where judgment is needed.

**Latency.** The single-label path is one vision call plus local comparison, which lands inside the ~5-second target the team set after their earlier vendor pilot. Batch fans out across images with capped concurrency so each individual response stays fast and results stream in as they finish.

**Accessibility and usability.** I designed this for the least tech-comfortable agent on the team, not the most. Large touch targets, status colors always paired with a text label (never color alone), keyboard-operable upload zones, `aria-live` result regions, and plain-language verdicts — aimed at the "clean, obvious, no hunting for buttons" benchmark and a team where half the agents are over 50.

## AI prompts used

I gave the model a tightly scoped, read-only role. The system prompt is:

> You are a meticulous OCR and data-extraction assistant for alcohol beverage label review. You read what is printed on a label image and return it verbatim. You never guess, never correct spelling, and never normalize wording. If a field is not visible, return null for it. Report exactly what the label says, including the full Government Warning text as printed.

The user turn sends the image plus: *"Read this alcohol beverage label and report its fields. Transcribe the Government Warning verbatim if present."*

Rather than free-form text, I make the model return its answer through a **forced tool call** (`report_label_fields`) whose schema requires each field (brand, class/type, alcohol content, net contents, the verbatim warning, whether the header is all-caps, whether it is bold, overall legibility, and image-quality notes). Forcing structured output makes the extraction deterministic to parse, stops the model from editorializing, and keeps it from making the pass/fail decision — that lives in my code. The full schema is in `lib/extract.ts`.

## Assumptions I made

- This is a standalone proof-of-concept — no COLA integration, no persistence, no auth — matching the prototype scope the IT note described.
- I treat the federal Government Warning text as the single required standard (27 CFR 16.21).
- One label image represents one product; multi-panel artwork (front/back as separate files) is out of scope here.
- Bold detection relies on the vision model's read of relative stroke weight; when it can't be judged confidently, I degrade the check to a manual-confirm warning rather than a false pass or fail.
- I assume cloud API access (Anthropic) is available for the deployed prototype. In TTB's actual firewalled network this would need an approved egress path or an on-prem vision model — I've noted it as a known constraint rather than pretending to solve it.

## Known limitations and trade-offs

- Extraction quality depends on image quality; I route very low-resolution or heavily obscured labels to review rather than force-reading them.
- Batch mode screens for self-contained issues only. Pairing each label with its application record (for example via a filename-keyed CSV) would be my next step.
- Class/type matching uses substring heuristics; a full TTB class/type taxonomy would let me make it stricter.
