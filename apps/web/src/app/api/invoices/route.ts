import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createInvoiceSchema = z.object({
  companyId: z.string(),
  clientName: z.string().min(1),
  notes: z.string().optional(),
  currency: z.string().length(3),
  taxRate: z.number().min(0).max(1),
  discount: z.number().min(0),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number(),
      unitPrice: z.number(),
      amount: z.number(),
      sortOrder: z.number(),
    }),
  ),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.companyId !== member.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await prisma.invoice.count({
    where: { companyId: member.companyId },
  });

  const existingClient = await prisma.client.findFirst({
    where: { companyId: member.companyId, name: parsed.data.clientName },
  });

  const client =
    existingClient ??
    (await prisma.client.create({
      data: {
        companyId: member.companyId,
        name: parsed.data.clientName,
      },
    }));

  const invoice = await prisma.invoice.create({
    data: {
      companyId: member.companyId,
      clientId: client.id,
      number: `INV-${String(count + 1).padStart(4, "0")}`,
      currency: parsed.data.currency,
      subtotal: parsed.data.subtotal,
      taxRate: parsed.data.taxRate,
      taxAmount: parsed.data.taxAmount,
      discount: parsed.data.discount,
      total: parsed.data.total,
      notes: parsed.data.notes,
      items: {
        create: parsed.data.lineItems,
      },
    },
    include: { items: true, client: true },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
