import type { Metadata } from "next";
import Link from "next/link";
import {
  NotebookDocument,
  NotebookSection,
} from "@/components/marketing/notebook-document";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "About — Invoice Desk",
  description:
    "Invoice Desk helps small businesses turn rough notes into professional invoices and estimates.",
};

export default function AboutPage() {
  return (
    <NotebookDocument
      title="About"
      subtitle="A quiet desk for the work of getting paid — built for people who bill, not for people who love paperwork."
    >
      <NotebookSection title="What we make">
        <p>
          Invoice Desk is a simple invoicing product for freelancers and small businesses. You
          describe the work in plain language — even in another language — and we help turn it
          into a clean, itemized invoice or estimate you can send with confidence.
        </p>
        <p>
          The goal is not another sprawling finance suite. It is a focused place to draft,
          brand, send, and track documents so less time is spent on formatting and chasing.
        </p>
      </NotebookSection>

      <NotebookSection title="How we think about it">
        <p>
          Invoicing should feel closer to writing a note than wrestling a spreadsheet. That is
          why the product stays deliberate: templates that look professional, estimates that
          convert to invoices, reminders when payment is due, and tools like QR codes when you
          need a shareable link in the world.
        </p>
        <ul>
          <li>Describe work once — review before anything goes out</li>
          <li>Keep clients, invoices, and estimates in one place</li>
          <li>Send branded PDFs and track what is owed</li>
          <li>Stay in control of how clients pay you</li>
        </ul>
      </NotebookSection>

      <NotebookSection title="Payments">
        <p>
          Invoice Desk helps you record and present payment details. We do not take custody of
          your clients&apos; money. When you attach a scan-to-pay link or payment instructions,
          those point to the providers you already use — PayPal, Stripe Payment Links, bank
          transfer, and similar.
        </p>
      </NotebookSection>

      <NotebookSection title="Who it is for">
        <p>
          Tradespeople, cleaners, consultants, creatives, and anyone else who already knows the
          job — and just needs the invoice to catch up.
        </p>
      </NotebookSection>

      <NotebookSection title="Talk to us">
        <p>
          Questions, feedback, or something that is not working? Write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We read every message.
        </p>
        <p>
          Prefer the fine print first? See our{" "}
          <Link href="/privacy">Privacy Policy</Link>, <Link href="/terms">Terms of Service</Link>
          , and <Link href="/cookies">Cookie Policy</Link>.
        </p>
      </NotebookSection>
    </NotebookDocument>
  );
}
