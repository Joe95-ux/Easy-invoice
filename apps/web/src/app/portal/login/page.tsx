import { PortalLoginForm } from "@/features/portal/components/portal-login-form";
import { getPortalSession } from "@/lib/portal/session";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Client portal sign in",
  description: "View your invoices and estimates from Invoice Desk.",
};

type PortalLoginPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function PortalLoginPage({ searchParams }: PortalLoginPageProps) {
  const session = await getPortalSession();
  if (session) redirect("/portal");

  const params = await searchParams;
  const initialEmail =
    typeof params.email === "string" ? params.email.trim().toLowerCase() : "";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center sm:text-left">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Client portal
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign in with email to see open invoices, estimates, and balances from the businesses you
          work with.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <PortalLoginForm initialEmail={initialEmail} />
      </div>
    </div>
  );
}
