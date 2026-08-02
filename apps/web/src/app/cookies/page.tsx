import type { Metadata } from "next";
import Link from "next/link";
import {
  NotebookDocument,
  NotebookSection,
} from "@/components/marketing/notebook-document";
import { SUPPORT_EMAIL } from "@/lib/support";

export const metadata: Metadata = {
  title: "Cookie Policy — Invoice Desk",
  description: "How Invoice Desk uses cookies and similar technologies.",
};

const UPDATED = "August 2, 2026";

export default function CookiesPage() {
  return (
    <NotebookDocument
      title="Cookie Policy"
      subtitle="What cookies and similar technologies Invoice Desk uses, and why."
      updated={UPDATED}
    >
      <NotebookSection title="1. Overview">
        <p>
          This Cookie Policy explains how <strong>Invoice Desk</strong> uses cookies and
          similar technologies on our website and application. It should be read together with
          our <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          Cookies are small text files stored on your device. We also use related technologies
          such as local storage and session storage for preferences and security.
        </p>
      </NotebookSection>

      <NotebookSection title="2. How we use cookies">
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Keep you signed in and protect your account</li>
          <li>Remember product preferences (for example color theme)</li>
          <li>Remember which company workspace you last used</li>
          <li>Unlock password-protected QR destinations you have already opened</li>
          <li>Maintain security and prevent abuse</li>
        </ul>
        <p>
          We do not use advertising cookies to track you across unrelated third-party sites for
          marketing networks.
        </p>
      </NotebookSection>

      <NotebookSection title="3. Types of cookies we use">
        <p>
          <strong>Essential / authentication.</strong> Required for sign-in sessions managed by
          our authentication provider (Clerk), CSRF protection, and core app security. The
          Service cannot function properly without these.
        </p>
        <p>
          <strong>Preferences.</strong> Remember choices such as light or dark theme so the
          interface stays consistent across visits.
        </p>
        <p>
          <strong>Functional product cookies.</strong> Examples include remembering your active
          company workspace and short-lived unlock tokens for password-gated public QR pages
          you choose to protect.
        </p>
        <p>
          <strong>Vendor cookies.</strong> Third parties that power parts of Invoice Desk (such
          as Clerk for authentication or Stripe for checkout when you subscribe) may set their
          own cookies subject to their policies.
        </p>
      </NotebookSection>

      <NotebookSection title="4. Duration">
        <ul>
          <li>
            <strong>Session cookies</strong> expire when you close your browser or after a short
            idle period.
          </li>
          <li>
            <strong>Persistent cookies</strong> remain until they expire or you delete them, so
            preferences and sessions can survive browser restarts.
          </li>
        </ul>
      </NotebookSection>

      <NotebookSection title="5. Managing cookies">
        <p>
          Most browsers let you block or delete cookies through their settings. If you block
          essential cookies, you may not be able to sign in or use Invoice Desk reliably.
        </p>
        <p>
          You can typically clear site data for Invoice Desk from your browser’s privacy
          controls, which removes preference and functional cookies stored for this domain.
        </p>
      </NotebookSection>

      <NotebookSection title="6. Changes">
        <p>
          We may update this Cookie Policy as the product or legal requirements change. The
          “Last updated” date at the top will reflect the latest revision.
        </p>
      </NotebookSection>

      <NotebookSection title="7. Contact">
        <p>
          Questions about cookies:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          Related: <Link href="/privacy">Privacy Policy</Link> ·{" "}
          <Link href="/terms">Terms of Service</Link> · <Link href="/about">About</Link>
        </p>
      </NotebookSection>
    </NotebookDocument>
  );
}
