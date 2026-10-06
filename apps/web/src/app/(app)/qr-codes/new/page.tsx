import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader } from "@/components/app-shell/page-header";
import { QrCodeCreator } from "@/features/qr-codes/components/qr-code-creator";
import { getAppOrigin } from "@/lib/app-url";
import { requireWriter } from "@/lib/auth";
import { QR_CODE_TYPES, type QrCodeType } from "@/lib/qr-codes/types";

type NewQrCodePageProps = {
  searchParams: Promise<{ type?: string }>;
};

function parseQrType(value: string | undefined): QrCodeType | undefined {
  if (!value) return undefined;
  const type = value.toUpperCase();
  return QR_CODE_TYPES.includes(type as QrCodeType) ? (type as QrCodeType) : undefined;
}

export default async function NewQrCodePage({ searchParams }: NewQrCodePageProps) {
  const member = await requireWriter();
  const origin = await getAppOrigin();
  const { type } = await searchParams;
  const initialType = parseQrType(type);

  return (
    <PageScroll>
      <QrCodeCreator
        mode="create"
        origin={origin}
        companyLogoUrl={member.company.logoUrl}
        initialType={initialType}
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
