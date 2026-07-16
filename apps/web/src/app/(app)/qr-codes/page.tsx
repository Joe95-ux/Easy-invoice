import Link from "next/link";
import { PlusIcon, QrCodeIcon } from "lucide-react";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrCodesTable } from "@/features/qr-codes/components/qr-codes-table";
import { getAppOrigin } from "@/lib/app-url";
import { requireMember } from "@/lib/auth";
import { getQrCodesForCompany } from "@/lib/qr-codes/service";

export default async function QrCodesPage() {
  const member = await requireMember();
  const [qrCodes, origin] = await Promise.all([
    getQrCodesForCompany(member.companyId),
    getAppOrigin(),
  ]);

  return (
    <PageScroll>
      <PageHeader
        title="QR codes"
        description="Create scannable codes for links, PDFs, contacts, and events — editable anytime."
        actions={
          <Button className={pageHeaderActionClass} render={<Link href="/qr-codes/new" />}>
            <PlusIcon className="size-4" />
            Create QR code
          </Button>
        }
      />

      {qrCodes.length === 0 ? (
        <EmptyState
          icon={QrCodeIcon}
          title="No QR codes yet"
          description="Generate your first dynamic QR code in a few clicks and download it print-ready."
          action={
            <Button render={<Link href="/qr-codes/new" />}>
              <PlusIcon className="size-4" />
              Create your first QR code
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <QrCodesTable
            qrCodes={qrCodes}
            origin={origin}
            companyLogoUrl={member.company.logoUrl}
          />
        </Card>
      )}
    </PageScroll>
  );
}
