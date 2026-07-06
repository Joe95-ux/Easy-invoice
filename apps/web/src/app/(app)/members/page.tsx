import { PageScroll } from "@/components/app-shell/app-shell";
import { MembersPageContent } from "@/features/team/components/members-page-content";
import { requireCompanyAdmin } from "@/lib/auth";
import { getTeamData } from "@/lib/team/data";

export default async function MembersPage() {
  const member = await requireCompanyAdmin();
  const teamData = await getTeamData({
    companyId: member.companyId,
    memberId: member.id,
    clerkId: member.clerkId,
    role: member.role,
  });

  return (
    <PageScroll maxWidth="4xl">
      <MembersPageContent initialData={teamData} />
    </PageScroll>
  );
}
