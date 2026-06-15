import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/onboarding");
  }

  const { company } = member;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {company.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Plan" value={company.plan} />
        <StatCard label="Currency" value={company.currency} />
        <StatCard label="Locale" value={company.locale} />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/invoices/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            New invoice
          </Link>
          <Link
            href="/invoices"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
          >
            View invoices
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
