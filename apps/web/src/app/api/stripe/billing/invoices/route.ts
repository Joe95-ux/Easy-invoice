import { NextResponse } from "next/server";
import { requireApiCompanyAdmin } from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import { listRecentBillingInvoices } from "@/lib/stripe-billing";

export async function GET() {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: member.companyId },
    select: { stripeCustomerId: true },
  });

  if (!company.stripeCustomerId) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const invoices = await listRecentBillingInvoices(company.stripeCustomerId, 5);
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("[stripe billing invoices]", error);
    return NextResponse.json({ error: "Could not load invoices" }, { status: 502 });
  }
}
