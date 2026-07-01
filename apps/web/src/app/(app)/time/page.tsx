import { PageScroll } from "@/components/app-shell/app-shell";
import { TimePageContent } from "@/features/time/components/time-page-content";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { prisma } from "@/lib/db";
import {
  getTimeEntriesForCompany,
  serializeTimeEntry,
} from "@/lib/time-tracking/service";

export default async function TimePage() {
  const member = await requireMember();

  const [entries, clients, company] = await Promise.all([
    getTimeEntriesForCompany(member.companyId),
    getClientsForMember(member.companyId),
    prisma.company.findUnique({
      where: { id: member.companyId },
      select: { currency: true, defaultHourlyRate: true },
    }),
  ]);

  return (
    <PageScroll fullWidth>
      <TimePageContent
        entries={entries.map(serializeTimeEntry)}
        clients={clients}
        currency={company?.currency ?? "USD"}
        defaultHourlyRate={
          company?.defaultHourlyRate ? Number(company.defaultHourlyRate) : null
        }
      />
    </PageScroll>
  );
}
