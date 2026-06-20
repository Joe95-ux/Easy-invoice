import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getInvoiceForMember } from "@/lib/invoices";

const updateInvoiceSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  clientEmail: z.string().email().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceForMember(id, member.companyId);

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await getInvoiceForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { status, notes, dueDate, clientEmail } = parsed.data;

  if (clientEmail && existing.clientId) {
    await prisma.client.update({
      where: { id: existing.clientId },
      data: { email: clientEmail },
    });
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(status === "PAID" && { paidAt: new Date() }),
      ...(status === "SENT" && !existing.sentAt && { sentAt: new Date() }),
    },
    include: { client: true, items: { orderBy: { sortOrder: "asc" } }, company: true },
  });

  return NextResponse.json({ invoice });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const { id } = await context.params;
  const existing = await getInvoiceForMember(id, member.companyId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.invoice.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
