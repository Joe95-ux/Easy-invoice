import { PageScroll } from "@/components/app-shell/app-shell";
import { TimePageContent } from "@/features/time/components/time-page-content";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { prisma } from "@/lib/db";
import { getProjectsForCompany } from "@/lib/projects";
import {
  getTimeEntriesForCompany,
  getRecentTimeDescriptions,
  serializeTimeEntry,
} from "@/lib/time-tracking/service";

export default async function TimePage() {
  const member = await requireMember();

  const [entries, clients, projects, company, recentDescriptions] = await Promise.all([
    getTimeEntriesForCompany(member.companyId),
    getClientsForMember(member.companyId),
    getProjectsForCompany(member.companyId),
    prisma.company.findUnique({
      where: { id: member.companyId },
      select: { currency: true, defaultHourlyRate: true },
    }),
    getRecentTimeDescriptions(member.companyId),
  ]);

  return (
    <PageScroll>
      <TimePageContent
        entries={entries.map(serializeTimeEntry)}
        clients={clients}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          clientId: project.clientId,
        }))}
        currency={company?.currency ?? "USD"}
        defaultHourlyRate={
          company?.defaultHourlyRate ? Number(company.defaultHourlyRate) : null
        }
        recentDescriptions={recentDescriptions}
      />
    </PageScroll>
  );
}
