"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DocumentShareButton } from "@/components/document-share-button";
import { FollowUpDialog } from "@/features/follow-ups/components/follow-up-dialog";
import { InvoiceCollectionsCard } from "@/features/invoices/components/invoice-collections-card";
import { InvoiceSendDialog } from "@/features/invoices/components/invoice-send-dialog";
import { getCollectionsAdvice } from "@/lib/collections/advice";
import type { InvoiceStatus } from "@easy-invoice/db";

type InvoiceGetPaidSectionProps = {
  invoiceId: string;
  invoiceNumber: string;
  companyName: string;
  status: InvoiceStatus;
  balanceDue: number;
  amountPaid: number;
  clientEmail?: string | null;
  clientName?: string | null;
  clientId?: string | null;
  dueDate?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  installmentCount: number;
  unpaidInstallmentCount: number;
  canPayOnline: boolean;
};

export function InvoiceGetPaidSection({
  invoiceId,
  invoiceNumber,
  companyName,
  status,
  balanceDue,
  amountPaid,
  clientEmail,
  clientName,
  clientId,
  dueDate,
  sentAt,
  viewedAt,
  installmentCount,
  unpaidInstallmentCount,
  canPayOnline,
}: InvoiceGetPaidSectionProps) {
  const router = useRouter();
  const [sendOpen, setSendOpen] = useState(false);
  const [draftTone, setDraftTone] = useState<"professional" | "collections">(
    "professional",
  );
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const advice = getCollectionsAdvice({
    status,
    balanceDue,
    amountPaid,
    dueDate: dueDate ? new Date(dueDate) : null,
    sentAt: sentAt ? new Date(sentAt) : null,
    viewedAt: viewedAt ? new Date(viewedAt) : null,
    installmentCount,
    unpaidInstallmentCount,
  });

  // Align with remind API: sent + (invoice due or a schedule with a next due).
  const canRemind =
    Boolean(sentAt) &&
    (Boolean(dueDate) || installmentCount > 0) &&
    (status === "SENT" ||
      status === "VIEWED" ||
      status === "OVERDUE" ||
      status === "PARTIALLY_PAID");

  function openSend(tone: "professional" | "collections") {
    setDraftTone(tone);
    setSendOpen(true);
  }

  if (advice.action === "none") {
    return null;
  }

  return (
    <>
      <InvoiceCollectionsCard
        invoiceId={invoiceId}
        advice={advice}
        clientEmail={clientEmail}
        canPayOnline={canPayOnline}
        canRemind={canRemind}
        onDraftChase={() => openSend("collections")}
        onSendInvoice={() => openSend("professional")}
        onAddFollowUp={() => setFollowUpOpen(true)}
        onShareLink={() => setShareOpen(true)}
      />

      <DocumentShareButton
        kind="invoice"
        documentId={invoiceId}
        showTrigger={false}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />

      <InvoiceSendDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        status={status}
        clientEmail={clientEmail}
        companyName={companyName}
        clientName={clientName}
        draftTone={draftTone}
      />

      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        clients={
          clientId ? [{ id: clientId, label: clientName ?? "Client" }] : []
        }
        invoices={[
          {
            id: invoiceId,
            label: clientName ? `${invoiceNumber} · ${clientName}` : invoiceNumber,
            clientId,
          },
        ]}
        estimates={[]}
        lockLink="invoice"
        showSuccessToast={false}
        defaults={{
          title: `Follow up on invoice ${invoiceNumber}`,
          dueDate,
          clientId,
          invoiceId,
        }}
        onCreated={() => {
          toast.success("Follow-up added", {
            action: {
              label: "View",
              onClick: () => router.push("/follow-ups"),
            },
          });
        }}
      />
    </>
  );
}
