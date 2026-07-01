import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getCurrentMember } from "@/lib/auth";
import { canManageCompanySettings, canManageTeam } from "@/lib/team";
import { zodFieldErrors } from "@/lib/validation/zod";

export { zodFieldErrors };

type ApiMember = NonNullable<Awaited<ReturnType<typeof getCurrentMember>>>;

type RequireApiMemberResult =
  | { member: ApiMember; response: null }
  | { member: null; response: NextResponse };

export async function requireApiMember(): Promise<RequireApiMemberResult> {
  const member = await getCurrentMember();
  if (!member) {
    return {
      member: null,
      response: NextResponse.json({ error: "No company" }, { status: 403 }),
    };
  }
  return { member, response: null };
}

export async function requireApiTeamManager(): Promise<RequireApiMemberResult> {
  const result = await requireApiMember();
  if (result.response) return result;

  if (!canManageTeam(result.member.role)) {
    return {
      member: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}

export async function requireApiCompanyAdmin(): Promise<RequireApiMemberResult> {
  const result = await requireApiMember();
  if (result.response) return result;

  if (!canManageCompanySettings(result.member.role)) {
    return {
      member: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return result;
}

export async function parseJsonBody<T>(request: Request): Promise<T | NextResponse> {
  try {
    return (await request.json()) as T;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    { error: "Invalid input", details: error.flatten() },
    { status: 400 },
  );
}
