import { NextResponse } from "next/server";
import { DOCUMENT_PARSE_MAX_DURATION_SECONDS, parseDocumentFromFile } from "@/lib/ai-docs";
import { requireApiMember } from "@/lib/api/validation";

export const maxDuration = DOCUMENT_PARSE_MAX_DURATION_SECONDS;

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function isAllowedFile(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true;

  const name = file.name.toLowerCase();
  return [".pdf", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) =>
    name.endsWith(ext),
  );
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Upload was interrupted or timed out. In development the first extraction can take over 2 minutes while the route compiles — please try again.",
      },
      { status: 408 },
    );
  }
  const file = formData.get("file");
  const documentKind = formData.get("documentKind");
  const extractionMode = formData.get("extractionMode");
  const knownClientName = formData.get("knownClientName");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!isAllowedFile(file)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, image, or text file." },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return NextResponse.json({ error: "File is too large (max 10 MB)" }, { status: 400 });
  }

  const kind = documentKind === "estimate" ? "estimate" : "invoice";
  const mode = extractionMode === "lines_only" ? "lines_only" : "full";

  try {
    const result = await parseDocumentFromFile(file, file.name || "upload", {
      documentKind: kind,
      extractionMode: mode,
      localeHint: member.company.locale,
      companyName: member.company.name,
      companyCurrency: member.company.currency,
      outputLanguage: "en",
      referenceDate: new Date().toISOString().slice(0, 10),
      knownClientName:
        typeof knownClientName === "string" && knownClientName.trim()
          ? knownClientName.trim()
          : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document parse failed";
    const status = message.toLowerCase().includes("timed out") ? 504 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
