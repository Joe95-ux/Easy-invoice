import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { parseJsonBody, validationError } from "@/lib/api/validation";
import { setActiveCompanyCookie } from "@/lib/active-company";
import { prisma } from "@/lib/db";
import { acceptInviteSchema } from "@/lib/schemas/team";
import { normalizeInviteEmail } from "@/lib/team";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invite = await prisma.companyInvite.findUnique({
    where: { token: parsed.data.token },
    include: { company: true },
  });

  if (!invite || invite.acceptedAt) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
  }

  const userEmails = user.emailAddresses.map((entry) =>
    normalizeInviteEmail(entry.emailAddress),
  );
  const inviteEmail = normalizeInviteEmail(invite.email);

  if (!userEmails.includes(inviteEmail)) {
    return NextResponse.json(
      {
        error: `This invite was sent to ${invite.email}. Sign in with that email to accept.`,
      },
      { status: 403 },
    );
  }

  const existingMember = await prisma.companyMember.findFirst({
    where: { companyId: invite.companyId, clerkId: userId },
  });

  if (existingMember) {
    await prisma.companyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    await setActiveCompanyCookie(invite.companyId);
    return NextResponse.json({
      company: { id: invite.company.id, name: invite.company.name },
      alreadyMember: true,
    });
  }

  await prisma.$transaction([
    prisma.companyMember.create({
      data: {
        companyId: invite.companyId,
        clerkId: userId,
        email: inviteEmail,
        role: invite.role,
        lastActiveAt: new Date(),
      },
    }),
    prisma.companyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  await setActiveCompanyCookie(invite.companyId);

  return NextResponse.json({
    company: { id: invite.company.id, name: invite.company.name },
    alreadyMember: false,
  });
}
