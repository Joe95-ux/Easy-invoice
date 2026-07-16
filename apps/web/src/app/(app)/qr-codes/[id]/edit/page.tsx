import { notFound } from "next/navigation";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { QrCodeCreator } from "@/features/qr-codes/components/qr-code-creator";
import { getAppOrigin } from "@/lib/app-url";
import { requireMember } from "@/lib/auth";
import { getQrCodeForCompany } from "@/lib/qr-codes/service";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditQrCodePage({ params }: PageProps) {
  const member = await requireMember();
  const { id } = await params;
  const [qrCode, origin] = await Promise.all([
    getQrCodeForCompany(id, member.companyId),
    getAppOrigin(),
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
    </PageScroll>
  );
}
