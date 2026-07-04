"use client";

import confetti from "canvas-confetti";
import { toast } from "sonner";

type PaymentRecordedFeedback = {
  invoiceNumber: string;
  status: string;
  celebrateInvoicePaid: boolean;
};

function firePaidConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.35 },
      colors: ["#22c55e", "#3b82f6", "#eab308", "#a855f7"],
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.35 },
      colors: ["#22c55e", "#3b82f6", "#eab308", "#a855f7"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

export function showPaymentRecordedFeedback({
  invoiceNumber,
  status,
  celebrateInvoicePaid,
}: PaymentRecordedFeedback) {
  const isFullyPaid = status === "PAID";

  if (isFullyPaid) {
    toast.success(`Invoice ${invoiceNumber} is fully paid!`, {
      description: "Great work — this invoice is settled.",
      duration: 5000,
    });
    if (celebrateInvoicePaid) {
      firePaidConfetti();
    }
    return;
  }

  toast.success("Payment recorded");
}
