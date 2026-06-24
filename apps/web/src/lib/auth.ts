import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function getCurrentMember() {
  const { userId } = await auth();
  if (!userId) return null;

  return prisma.companyMember.findFirst({
    where: { clerkId: userId },
    include: { company: true },
  });
}

export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");
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
