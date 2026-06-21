import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentMember } from "@/lib/auth";
import { prisma } from "@/lib/db";

const createInvoiceSchema = z.object({
  companyId: z.string(),
  clientId: z.string().optional(),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().length(3),
  taxRate: z.number().min(0).max(1),
  discount: z.number().min(0),
  subtotal: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
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

  const clientData = {
    name: parsed.data.clientName,
    email: parsed.data.clientEmail || null,
    phone: parsed.data.clientPhone || null,
    address: parsed.data.clientAddress || null,
  };

  let client;

  if (parsed.data.clientId) {
    const existingById = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, companyId: member.companyId },
    });
    if (!existingById) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    client = await prisma.client.update({
      where: { id: existingById.id },
      data: {
        name: clientData.name,
        email: clientData.email ?? existingById.email,
        phone: clientData.phone ?? existingById.phone,
        address: clientData.address ?? existingById.address,
      },
    });
  } else {
    const existingClient = await prisma.client.findFirst({
      where: { companyId: member.companyId, name: parsed.data.clientName },
    });

    client = existingClient
      ? await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            email: clientData.email ?? existingClient.email,
            phone: clientData.phone ?? existingClient.phone,
            address: clientData.address ?? existingClient.address,
          },
        })
      : await prisma.client.create({
          data: { companyId: member.companyId, ...clientData },
        });
  }

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
      issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      items: {
        create: parsed.data.lineItems,
      },
    },
    include: { items: true, client: true },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
