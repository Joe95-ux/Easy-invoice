import { cookies } from "next/headers";

export const ACTIVE_COMPANY_COOKIE = "active_company_id";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getActiveCompanyIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value ?? null;
}

export async function setActiveCompanyCookie(companyId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}
