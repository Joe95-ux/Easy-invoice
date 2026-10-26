"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactSupportForm } from "@/components/app-shell/contact-support-form";
import { useCompanyPlan } from "@/components/billing/company-plan-context";
import { PRO_SUPPORT_SLA } from "@/lib/support";

type SupportContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportContactDialog({ open, onOpenChange }: SupportContactDialogProps) {
  const { isPro } = useCompanyPlan();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            {isPro
              ? `Pro priority — we aim to reply by the ${PRO_SUPPORT_SLA} to your account email.`
              : "Send a message to the Invoice Desk team. We reply to your account email."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ContactSupportForm
            idPrefix="support-dialog"
            showIntro={false}
            onSent={() => onOpenChange(false)}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
