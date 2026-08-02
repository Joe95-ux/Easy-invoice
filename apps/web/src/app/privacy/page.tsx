import type { Metadata } from "next";
import Link from "next/link";
import {
  NotebookDocument,
  NotebookSection,
} from "@/components/marketing/notebook-document";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy Policy — Invoice Desk",
  description: "How Invoice Desk collects, uses, and protects your information.",
};

const UPDATED = "August 2, 2026";

export default function PrivacyPage() {
  return (
    <NotebookDocument
      title="Privacy Policy"
      subtitle="A plain-language account of what we collect, why we collect it, and the choices you have."
      updated={UPDATED}
    >
      <NotebookSection title="1. Who we are">
        <p>
          This policy describes how <strong>Invoice Desk</strong> (“we”, “us”) handles personal
          information when you use our website and application (the “Service”). For privacy
          questions, contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </NotebookSection>

      <NotebookSection title="2. Information we collect">
        <p>Depending on how you use Invoice Desk, we may collect:</p>
        <ul>
          <li>
            <strong>Account information</strong> — name, email address, and authentication
            details managed through our sign-in provider (Clerk).
          </li>
          <li>
            <strong>Business profile</strong> — company name, address, phone, logo, branding,
            and payment instructions you choose to store.
          </li>
          <li>
            <strong>Client and document data</strong> — client contact details, invoice and
            estimate contents, line items, notes, payment records you enter, and related files.
          </li>
          <li>
            <strong>Usage and device data</strong> — IP address, browser type, approximate
            location derived from IP, pages viewed, and similar diagnostics needed to run and
            secure the Service.
          </li>
          <li>
            <strong>Support messages</strong> — content you send through in-app help or email.
          </li>
          <li>
            <strong>Payment for subscriptions</strong> — if you subscribe to a paid plan,
            billing is processed by Stripe. We do not store full card numbers on our servers.
          </li>
        </ul>
      </NotebookSection>

      <NotebookSection title="3. How we use information">
        <p>We use personal information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Create and send invoices, estimates, receipts, and related emails on your behalf</li>
          <li>
            Run optional AI features that help draft or structure document content from text you
            provide
          </li>
          <li>Authenticate users, prevent abuse, and keep accounts secure</li>
          <li>Respond to support requests and send operational notices</li>
          <li>Comply with law and enforce our Terms of Service</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use your client invoice content to
          train general-purpose public AI models for unrelated products.
        </p>
      </NotebookSection>

      <NotebookSection title="4. AI features">
        <p>
          When you use describe-to-invoice or similar tools, the text you submit may be
          processed by third-party AI providers solely to generate drafts for your review. Do
          not submit information you are not authorized to process. You remain responsible for
          reviewing AI output before sending documents to clients.
        </p>
      </NotebookSection>

      <NotebookSection title="5. How we share information">
        <p>We share information only as needed to operate Invoice Desk, including with:</p>
        <ul>
          <li>
            <strong>Infrastructure and vendors</strong> such as hosting, database, email
            delivery (e.g. Resend), file storage (e.g. Cloudinary), authentication (Clerk),
            billing (Stripe), and realtime notification providers
          </li>
          <li>
            <strong>Your recipients</strong> when you send an invoice, estimate, or share a
            public link / QR landing page
          </li>
          <li>
            <strong>Legal and safety</strong> disclosures when required by law or to protect
            rights, safety, and the integrity of the Service
          </li>
        </ul>
        <p>
          Team members you invite to your company workspace can access company data according
          to the roles you assign.
        </p>
      </NotebookSection>

      <NotebookSection title="6. Public links">
        <p>
          Documents and QR destinations you choose to share via public links may be viewed by
          anyone who has the URL. Treat those links as confidential unless you intend them to be
          public, and revoke or regenerate them when appropriate.
        </p>
      </NotebookSection>

      <NotebookSection title="7. Cookies and similar technologies">
        <p>
          We use cookies and similar technologies for authentication, security, preferences
          (such as theme), and essential product features. Details are in our{" "}
          <Link href="/cookies">Cookie Policy</Link>.
        </p>
      </NotebookSection>

      <NotebookSection title="8. Data retention">
        <p>
          We retain account and business data while your account is active and for a reasonable
          period afterward if needed for backups, dispute resolution, or legal obligations. You
          may request deletion of your account by contacting{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>; some records may remain where
          retention is required by law.
        </p>
      </NotebookSection>

      <NotebookSection title="9. Security">
        <p>
          We use industry-standard safeguards appropriate to the nature of the data we process.
          No method of transmission or storage is perfectly secure; please use a strong password
          and protect access to your account and devices.
        </p>
      </NotebookSection>

      <NotebookSection title="10. International transfers">
        <p>
          Invoice Desk may process data in countries other than where you live. Where we do, we
          take steps designed to protect information in accordance with this policy and
          applicable law.
        </p>
      </NotebookSection>

      <NotebookSection title="11. Your choices">
        <ul>
          <li>Update profile and company information in Settings</li>
          <li>Invite or remove team members from your workspace</li>
          <li>Request access, correction, or deletion by emailing {SUPPORT_EMAIL}</li>
          <li>
            Depending on where you live, you may have additional rights under local privacy laws
            (for example GDPR or CCPA). Contact us to exercise them.
          </li>
        </ul>
      </NotebookSection>

      <NotebookSection title="12. Children">
        <p>
          Invoice Desk is not directed to children under 16, and we do not knowingly collect
          personal information from them.
        </p>
      </NotebookSection>

      <NotebookSection title="13. Changes">
        <p>
          We may update this policy from time to time. The “Last updated” date at the top will
          change when we do. Continued use of the Service after an update means you accept the
          revised policy.
        </p>
      </NotebookSection>

      <NotebookSection title="14. Contact">
        <p>
          Privacy requests: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          Related pages: <Link href="/terms">Terms of Service</Link> ·{" "}
          <Link href="/cookies">Cookie Policy</Link> · <Link href="/about">About</Link>
        </p>
      </NotebookSection>
    </NotebookDocument>
  );
}
