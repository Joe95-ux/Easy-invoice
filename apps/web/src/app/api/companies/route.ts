import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { createUniqueCompanySlug } from "@/lib/auth";
import { prisma, UserRole } from "@/lib/db";
import { companyOnboardingSchema } from "@/lib/schemas/company";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.companyMember.findFirst({
    where: { clerkId: userId },
  });
  if (existing) {
    return NextResponse.json({ error: "Company already exists" }, { status: 409 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = companyOnboardingSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const user = await currentUser();
  const email = parsed.data.email || user?.emailAddresses[0]?.emailAddress || "";
  const slug = await createUniqueCompanySlug(parsed.data.name);

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      slug,
      email: email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      zip: parsed.data.zip || null,
      country: parsed.data.country,
      currency: parsed.data.currency,
      locale: parsed.data.locale,
      members: {
        create: {
          clerkId: userId,
          email,
          role: UserRole.OWNER,
        },
      },
    },
  });

  return NextResponse.json({ company }, { status: 201 });
}
