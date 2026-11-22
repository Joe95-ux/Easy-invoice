import { PageScroll } from "@/components/app-shell/app-shell";
import { RetentionPageContent } from "@/features/retention/components/retention-page-content";
import { requireMember } from "@/lib/auth";
import { isProPlan } from "@/lib/billing/entitlements";
import {
  countRetentionSegments,
  RETENTION_SEGMENT_DESCRIPTION,
  RETENTION_SEGMENT_LABEL,
  RETENTION_SEGMENTS,
} from "@/lib/retention/segments";
import {
  getRetentionCampaigns,
  RETENTION_MAX_RECIPIENTS,
  serializeRetentionCampaign,
} from "@/lib/retention/service";
import { canWriteDocuments } from "@/lib/team";

export default async function RetentionPage() {
  const member = await requireMember();
  const [counts, campaigns] = await Promise.all([
    countRetentionSegments(member.companyId),
    getRetentionCampaigns(member.companyId),
  ]);

  return (
    <PageScroll>
      <RetentionPageContent
        canWrite={canWriteDocuments(member.role)}
        isPro={isProPlan(member.company.plan)}
        maxRecipients={RETENTION_MAX_RECIPIENTS}
        companyName={member.company.name}
        segments={RETENTION_SEGMENTS.map((id) => ({
          id,
          label: RETENTION_SEGMENT_LABEL[id],
          description: RETENTION_SEGMENT_DESCRIPTION[id],
          count: counts[id],
        }))}
        initialCampaigns={campaigns.map(serializeRetentionCampaign)}
      />
    </PageScroll>
  );
}
