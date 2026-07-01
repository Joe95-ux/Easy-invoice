import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getActiveCompanyIdFromCookie,
  setActiveCompanyCookie,
} from "@/lib/active-company";
import { prisma } from "@/lib/db";

const memberOrderBy = [
  { lastActiveAt: "desc" as const },
  { createdAt: "asc" as const },
];

/** Persists active company cookie from route handler (not allowed in Server Components). */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCompanyId = await getActiveCompanyIdFromCookie();
  if (activeCompanyId) {
    const existing = await prisma.companyMember.findFirst({
      where: { clerkId: userId, companyId: activeCompanyId },
    });
    if (existing) {
      return NextResponse.json({ companyId: activeCompanyId });
    }
  }

  const member = await prisma.companyMember.findFirst({
    where: { clerkId: userId },
    orderBy: memberOrderBy,
  });

  if (!member) {
    return NextResponse.json({ error: "No company" }, { status: 404 });
  }

  await setActiveCompanyCookie(member.companyId);

  return NextResponse.json({ companyId: member.companyId });
}
