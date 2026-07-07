import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai-docs";
import { requireApiMember } from "@/lib/api/validation";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const { response } = await requireApiMember();
  if (response) return response;

  const formData = await request.formData();
  const file = formData.get("audio");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file is too large (max 25 MB)" }, { status: 400 });
  }

  try {
    const text = await transcribeAudio(file, file.name || "recording.webm");
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
