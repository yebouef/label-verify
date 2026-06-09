// Vision extraction: send a label image to Claude and get back the
// structured fields we need to compare against the application.
//
// We ask the model only to *read* the label — every accept/reject
// decision is made by deterministic code in compare.ts. That keeps the
// compliance logic auditable and the model's role narrow.

import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedLabel } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const SYSTEM = `You are a meticulous OCR and data-extraction assistant for alcohol beverage label review. You read what is printed on a label image and return it verbatim. You never guess, never correct spelling, and never normalize wording. If a field is not visible, return null for it. Report exactly what the label says, including the full Government Warning text as printed.`;

const TOOL = {
  name: "report_label_fields",
  description: "Report the fields read from the alcohol label image.",
  input_schema: {
    type: "object" as const,
    properties: {
      brandName: { type: ["string", "null"], description: "Brand name exactly as printed, or null." },
      classType: { type: ["string", "null"], description: "Class/type designation (e.g. 'Kentucky Straight Bourbon Whiskey'), or null." },
      alcoholContent: { type: ["string", "null"], description: "Alcohol content exactly as printed (e.g. '45% Alc./Vol. (90 Proof)'), or null." },
      netContents: { type: ["string", "null"], description: "Net contents exactly as printed (e.g. '750 mL'), or null." },
      governmentWarning: { type: ["string", "null"], description: "The full Government Warning statement, transcribed verbatim including punctuation, or null if absent." },
      governmentWarningIsAllCaps: { type: ["boolean", "null"], description: "True if the literal words 'GOVERNMENT WARNING:' appear in all capital letters; false if not all caps; null if no warning found." },
      governmentWarningIsBold: { type: ["boolean", "null"], description: "True if the 'GOVERNMENT WARNING:' header is rendered in bold (visibly heavier stroke weight than surrounding body text); false if it is not bold; null only if a warning is present but boldness genuinely cannot be judged from the image." },
      legibility: { type: "string", enum: ["clear", "partial", "unreadable"], description: "Overall readability of the label image." },
      notes: { type: ["string", "null"], description: "Brief notes on image quality issues (glare, angle, blur), or null." },
    },
    required: ["brandName", "classType", "alcoholContent", "netContents", "governmentWarning", "governmentWarningIsAllCaps", "governmentWarningIsBold", "legibility", "notes"],
  },
};

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export async function extractLabel(
  base64: string,
  mediaType: ImageMediaType,
): Promise<ExtractedLabel> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "report_label_fields" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Read this alcohol beverage label and report its fields. Transcribe the Government Warning verbatim if present." },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("The vision model did not return structured label fields.");
  }
  return block.input as ExtractedLabel;
}
