import type { Metadata } from "next";
import Link from "next/link";
import {
  NotebookDocument,
  NotebookSection,
} from "@/components/marketing/notebook-document";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Terms of Service — Invoice Desk",
  description: "The terms that govern your use of Invoice Desk.",
};

const UPDATED = "August 2, 2026";

export default function TermsPage() {
  return (
    <NotebookDocument
      title="Terms of Service"
      subtitle="The agreement between you and Invoice Desk when you use the product."
      updated={UPDATED}
    >
      <NotebookSection title="1. Agreement">
        <p>
          By accessing or using <strong>Invoice Desk</strong> (the “Service”), you agree to
          these Terms of Service (“Terms”). If you are using the Service on behalf of a
          business, you represent that you have authority to bind that business.
        </p>
        <p>
          If you do not agree, do not use Invoice Desk. Our{" "}
          <Link href="/privacy">Privacy Policy</Link> explains how we handle personal
          information.
        </p>
      </NotebookSection>

      <NotebookSection title="2. The Service">
        <p>
          Invoice Desk provides tools to create, manage, send, and track invoices, estimates,
          related documents, and optional features such as QR destinations and reminders. We
          may change, add, or remove features over time.
        </p>
        <p>
          <strong>We are not your bank, payment processor, accountant, or law firm.</strong>{" "}
          Documents you generate are templates and records you control. You are responsible for
          their accuracy, tax treatment, and compliance with laws that apply to your business.
        </p>
      </NotebookSection>

      <NotebookSection title="3. Accounts">
        <ul>
          <li>You must provide accurate account information and keep it updated.</li>
          <li>You are responsible for activity under your account and for protecting credentials.</li>
          <li>
            You must be old enough to form a binding contract in your jurisdiction (and at least
            16).
          </li>
          <li>
            Workspace owners and admins are responsible for the access they grant to teammates.
          </li>
        </ul>
      </NotebookSection>

      <NotebookSection title="4. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for unlawful, fraudulent, or deceptive activity</li>
          <li>Infringe others’ intellectual property or privacy rights</li>
          <li>Attempt to access systems or data without authorization</li>
          <li>Interfere with or disrupt the Service, or reverse engineer it except where allowed by law</li>
          <li>Upload malware or abuse AI features to generate harmful or abusive content</li>
          <li>Resell or redistribute the Service without our written permission</li>
        </ul>
        <p>We may suspend or terminate access for violations of these Terms.</p>
      </NotebookSection>

      <NotebookSection title="5. Your content">
        <p>
          You retain ownership of the content you upload or create (clients, invoices,
          estimates, logos, notes, and similar). You grant us a limited license to host,
          process, transmit, and display that content solely to operate and improve the
          Service.
        </p>
        <p>
          You represent that you have the rights needed to use the content you provide,
          including client contact details and materials used on public QR or share pages.
        </p>
      </NotebookSection>

      <NotebookSection title="6. AI-assisted drafting">
        <p>
          Optional AI features may suggest wording, structure, translations, or line items.
          Output can be incomplete or incorrect. You must review all drafts before sending them
          to clients. Invoice Desk is not liable for decisions you make based on AI suggestions.
        </p>
      </NotebookSection>

      <NotebookSection title="7. Payments between you and your clients">
        <p>
          When clients pay your invoices, payment typically occurs outside Invoice Desk through
          methods you specify (bank transfer, PayPal, Stripe Payment Links, cash, and so on). We
          do not hold client funds and are not a party to those transactions. Recording a
          payment in Invoice Desk is a bookkeeping aid, not proof of funds received unless you
          verify it independently.
        </p>
      </NotebookSection>

      <NotebookSection title="8. Subscriptions and billing">
        <p>
          Some features may require a paid plan. Prices and included features are shown at
          signup or in-product. Fees are billed through Stripe or another processor we designate.
          Except where required by law or stated otherwise at purchase, fees are non-refundable.
          We may change pricing with reasonable notice for subsequent billing periods.
        </p>
      </NotebookSection>

      <NotebookSection title="9. Intellectual property">
        <p>
          The Service, including software, design, trademarks, and documentation, is owned by
          Invoice Desk and its licensors. These Terms do not grant you ownership of the Service —
          only a limited right to use it as permitted here.
        </p>
      </NotebookSection>

      <NotebookSection title="10. Third-party services">
        <p>
          The Service integrates with third parties (for example authentication, email delivery,
          file hosting, and billing). Their terms and privacy practices apply to their
          processing. We are not responsible for third-party outages or policy changes outside
          our control.
        </p>
      </NotebookSection>

      <NotebookSection title="11. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT. We do not warrant that the Service will be
          uninterrupted, error-free, or free of harmful components.
        </p>
      </NotebookSection>

      <NotebookSection title="12. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, INVOICE DESK AND ITS AFFILIATES WILL NOT BE
          LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR
          LOST PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER
          OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM
          OR (B) ONE HUNDRED U.S. DOLLARS (US$100).
        </p>
      </NotebookSection>

      <NotebookSection title="13. Indemnity">
        <p>
          You agree to indemnify and hold harmless Invoice Desk and its affiliates from claims,
          damages, and expenses (including reasonable legal fees) arising from your content,
          your use of the Service, or your violation of these Terms or applicable law.
        </p>
      </NotebookSection>

      <NotebookSection title="14. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you
          breach these Terms, if required by law, or if we discontinue the Service. Provisions
          that by nature should survive (including ownership, disclaimers, limitations, and
          indemnity) will survive termination.
        </p>
      </NotebookSection>

      <NotebookSection title="15. Changes">
        <p>
          We may update these Terms. Material changes will be reflected by the “Last updated”
          date and, where appropriate, additional notice. Continued use after changes take
          effect constitutes acceptance.
        </p>
      </NotebookSection>

      <NotebookSection title="16. Governing law">
        <p>
          These Terms are governed by the laws applicable in the jurisdiction where Invoice Desk
          operates its primary business, without regard to conflict-of-law rules, unless
          mandatory consumer protections in your country provide otherwise.
        </p>
      </NotebookSection>

      <NotebookSection title="17. Contact">
        <p>
          Questions about these Terms:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          Related: <Link href="/privacy">Privacy Policy</Link> ·{" "}
          <Link href="/cookies">Cookie Policy</Link> · <Link href="/about">About</Link>
        </p>
      </NotebookSection>
    </NotebookDocument>
  );
}
