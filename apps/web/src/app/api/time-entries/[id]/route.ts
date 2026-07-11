import { NextResponse } from "next/server";
import {
  parseJsonBody,
  requireApiMember,
  validationError,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { updateTimeEntrySchema } from "@/lib/schemas/time-entry";
import { hoursToMinutes } from "@/lib/time-tracking/format";
import { serializeTimeEntry } from "@/lib/time-tracking/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await prisma.timeEntry.findFirst({
    where: { id, companyId: member.companyId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.invoicedAt) {
    return NextResponse.json({ error: "Billed time entries cannot be edited" }, { status: 409 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = updateTimeEntrySchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId: member.companyId },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  const entry = await prisma.timeEntry.update({
    where: { id },
    data: {
      ...(data.clientId !== undefined && { clientId: data.clientId || null }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.hours !== undefined && { durationMinutes: hoursToMinutes(data.hours) }),
      ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
      ...(data.billable !== undefined && { billable: data.billable }),
    },
    include: {
      client: { select: { id: true, name: true } },
      invoice: { select: { id: true, number: true } },
      member: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ entry: serializeTimeEntry(entry) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const existing = await prisma.timeEntry.findFirst({
    where: { id, companyId: member.companyId },
    select: { id: true, invoicedAt: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.invoicedAt) {
    return NextResponse.json({ error: "Billed time entries cannot be deleted" }, { status: 409 });
  }

  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
