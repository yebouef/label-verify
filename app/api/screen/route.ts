import { NextRequest, NextResponse } from "next/server";
import { extractLabel, type ImageMediaType } from "@/lib/extract";
import { screenLabel } from "@/lib/screen";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED: ImageMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Processes one image per request. The client fans out across files so
// labels are screened in parallel and results stream in as they finish,
// keeping each individual response well under the 5-second target.
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A label image file is required." }, { status: 400 });
  }
  const mediaType = file.type as ImageMediaType;
  if (!ALLOWED.includes(mediaType)) {
    return NextResponse.json({ error: `Unsupported image type "${file.type}".` }, { status: 400 });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const extracted = await extractLabel(base64, mediaType);
    return NextResponse.json(screenLabel(extracted));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screening failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
