import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  getActiveCompanyIdFromCookie,
  setActiveCompanyCookie,
} from "@/lib/active-company";
import { prisma } from "@/lib/db";
import { canManageCompanySettings } from "@/lib/team";

const memberInclude = { company: true } as const;

const memberOrderBy = [
  { lastActiveAt: "desc" as const },
  { createdAt: "asc" as const },
];

export async function getUserMemberships(clerkId: string) {
  return prisma.companyMember.findMany({
    where: { clerkId },
    include: memberInclude,
    orderBy: memberOrderBy,
  });
}

export async function getCurrentMember() {
  const { userId } = await auth();
  if (!userId) return null;

  const activeCompanyId = await getActiveCompanyIdFromCookie();

  if (activeCompanyId) {
    const activeMember = await prisma.companyMember.findFirst({
      where: { clerkId: userId, companyId: activeCompanyId },
      include: memberInclude,
    });
    if (activeMember) return activeMember;
  }

  const member = await prisma.companyMember.findFirst({
    where: { clerkId: userId },
    include: memberInclude,
    orderBy: memberOrderBy,
  });

  return member;
}

export async function switchActiveCompany(clerkId: string, companyId: string) {
  const member = await prisma.companyMember.findFirst({
    where: { clerkId, companyId },
    include: memberInclude,
  });

  if (!member) return null;

  await setActiveCompanyCookie(companyId);
  await prisma.companyMember.update({
    where: { id: member.id },
    data: { lastActiveAt: new Date() },
  });

  return member;
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
  return member;
}

export async function requireCompanyAdmin() {
  const member = await requireMember();
  if (!canManageCompanySettings(member.role)) redirect("/dashboard");
  return member;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createUniqueCompanySlug(name: string): Promise<string> {
  const base = slugify(name) || "company";
  let slug = base;
  let attempt = 0;

  while (await prisma.company.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt}`;
  }

  return slug;
}

export { UserRole } from "@/lib/db";
