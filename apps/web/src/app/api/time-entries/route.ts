import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { timeEntrySchema } from "@/lib/schemas/time-entry";
import {
  createTimeEntry,
  getTimeEntriesForCompany,
  serializeTimeEntry,
} from "@/lib/time-tracking/service";

export async function GET(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId") ?? undefined;
  const unbilledOnly = searchParams.get("unbilledOnly") === "true";
  const ids = searchParams.get("ids")?.split(",").filter(Boolean);

  const entries = await getTimeEntriesForCompany(member.companyId, {
    clientId,
    ids: ids?.length ? ids : undefined,
    unbilledOnly,
    billableOnly: unbilledOnly,
  });

  const company = await prisma.company.findUnique({
    where: { id: member.companyId },
    select: { defaultHourlyRate: true },
  });

  return NextResponse.json({
    entries: entries.map(serializeTimeEntry),
    defaultHourlyRate: company?.defaultHourlyRate
      ? Number(company.defaultHourlyRate)
      : null,
  });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = timeEntrySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const entry = await createTimeEntry(member.companyId, member.id, parsed.data);
    return NextResponse.json({ entry: serializeTimeEntry(entry) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to log time";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
