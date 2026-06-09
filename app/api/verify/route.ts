import { NextRequest, NextResponse } from "next/server";
import { extractLabel, type ImageMediaType } from "@/lib/extract";
import { verifyLabel } from "@/lib/compare";
import type { ApplicationData, BeverageType } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function readApplication(form: FormData): ApplicationData {
  const get = (k: string) => (form.get(k)?.toString() ?? "").trim();
  return {
    brandName: get("brandName"),
    classType: get("classType"),
    alcoholContent: get("alcoholContent"),
    netContents: get("netContents"),
    beverageType: (get("beverageType") || "spirits") as BeverageType,
  };
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const app = readApplication(form);
  if (!app.brandName) {
    return NextResponse.json({ error: "Brand name is required in the application data." }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A label image file is required." }, { status: 400 });
  }
  const mediaType = file.type as ImageMediaType;
  if (!ALLOWED.includes(mediaType)) {
    return NextResponse.json(
      { error: `Unsupported image type "${file.type}". Use JPEG, PNG, WebP, or GIF.` },
      { status: 400 },
    );
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Image exceeds the 12 MB limit." }, { status: 400 });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const extracted = await extractLabel(base64, mediaType);
    const result = verifyLabel(app, extracted);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
