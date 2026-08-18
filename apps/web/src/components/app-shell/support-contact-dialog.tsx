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

type SupportContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SupportContactDialog({ open, onOpenChange }: SupportContactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Send a message to the Invoice Desk team. We reply to your account email.
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
