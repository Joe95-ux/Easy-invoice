import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { z } from "zod";

const prefsSchema = z.object({
  notifyClientViewed: z.boolean().optional(),
  notifyEstimateResponse: z.boolean().optional(),
  notifyPaymentReceived: z.boolean().optional(),
  notifyInvoiceOverdue: z.boolean().optional(),
  notifyTeamChanges: z.boolean().optional(),
});

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const m = await prisma.companyMember.findUnique({
    where: { id: member.id },
    select: {
      notifyClientViewed: true,
      notifyEstimateResponse: true,
      notifyPaymentReceived: true,
      notifyInvoiceOverdue: true,
      notifyTeamChanges: true,
    },
  });

  return NextResponse.json({ preferences: m });
}

export async function PUT(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const updated = await prisma.companyMember.update({
    where: { id: member.id },
    data: parsed.data,
    select: {
      notifyClientViewed: true,
      notifyEstimateResponse: true,
      notifyPaymentReceived: true,
      notifyInvoiceOverdue: true,
      notifyTeamChanges: true,
    },
  });

  return NextResponse.json({ preferences: updated });
}
