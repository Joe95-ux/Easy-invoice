import { notFound } from "next/navigation";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { QrCodeCreator } from "@/features/qr-codes/components/qr-code-creator";
import { QrScanHistoryCard } from "@/features/qr-codes/components/qr-scan-history";
import { getAppOrigin } from "@/lib/app-url";
import { requireWriter } from "@/lib/auth";
import { isProPlan } from "@/lib/billing/entitlements";
import { getQrCodeForCompany } from "@/lib/qr-codes/service";
import { getQrScanHistory } from "@/lib/qr-codes/scans";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditQrCodePage({ params }: PageProps) {
  const member = await requireWriter();
  const { id } = await params;
  const isPro = isProPlan(member.company.plan);
  const [qrCode, origin, history] = await Promise.all([
    getQrCodeForCompany(id, member.companyId),
    getAppOrigin(),
    isPro ? getQrScanHistory(id, member.companyId) : Promise.resolve(null),
  ]);

  if (!qrCode) notFound();

  return (
    <PageScroll>
      <PageBackLink href="/qr-codes">Back to QR codes</PageBackLink>
      <PageHeader
        title="Edit QR code"
        description="Update where this code points or restyle it — the printed code keeps working."
      />
      <QrCodeCreator
        mode="edit"
        origin={origin}
        companyLogoUrl={member.company.logoUrl}
        initial={qrCode}
      />
      <QrScanHistoryCard isPro={isPro} history={history} />
    </PageScroll>
  );
}
