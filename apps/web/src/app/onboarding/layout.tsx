import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (userId) {
    const membershipCount = await prisma.companyMember.count({
      where: { clerkId: userId },
    });

    if (membershipCount > 0) {
      redirect("/dashboard");
    }
  }

  return children;
}
