import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { QrCodeCreator } from "@/features/qr-codes/components/qr-code-creator";
import { getAppOrigin } from "@/lib/app-url";
import { requireMember } from "@/lib/auth";

export default async function NewQrCodePage() {
  const member = await requireMember();
  const origin = await getAppOrigin();

  return (
    <PageScroll>
      <QrCodeCreator
        mode="create"
        origin={origin}
        companyLogoUrl={member.company.logoUrl}
        header={
          <>
            <PageBackLink href="/qr-codes">Back to QR codes</PageBackLink>
            <PageHeader
              title="Create QR code"
              description="Pick a type, add your details, and style it to match your brand."
            />
          </>
        }
      />
    </PageScroll>
  );
}
