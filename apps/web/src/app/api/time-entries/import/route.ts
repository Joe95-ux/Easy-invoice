import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { timeImportSchema } from "@/lib/schemas/time-entry";
import { importExternalTimeEntries } from "@/lib/time-tracking/import/service";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = timeImportSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await importExternalTimeEntries(
      member.companyId,
      member.id,
      parsed.data,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
