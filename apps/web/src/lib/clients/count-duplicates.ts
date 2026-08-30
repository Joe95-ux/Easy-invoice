import "server-only";

import { prisma } from "@/lib/db";
import { normalizePortalEmail } from "@/lib/portal/tokens";

/** How many email addresses appear on more than one client in this company. */
export async function countClientEmailDuplicateGroups(
  companyId: string,
): Promise<number> {
  const clients = await prisma.client.findMany({
    where: { companyId, email: { not: null } },
    select: { email: true },
  });

  const counts = new Map<string, number>();
  for (const row of clients) {
    const email = row.email ? normalizePortalEmail(row.email) : "";
    if (!email.includes("@")) continue;
    counts.set(email, (counts.get(email) ?? 0) + 1);
  }

  let groups = 0;
  for (const count of counts.values()) {
    if (count > 1) groups += 1;
  }
  return groups;
}
