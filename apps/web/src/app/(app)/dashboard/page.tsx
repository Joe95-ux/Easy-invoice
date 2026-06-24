import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";

export default async function DashboardPage() {
  const member = await requireMember();

  const { company } = member;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Welcome back, {company.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Plan" value={company.plan} />
        <StatCard label="Currency" value={company.currency} />
        <StatCard label="Locale" value={company.locale} />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/invoices/new">
            <Button>New invoice</Button>
          </Link>
          <Link href="/invoices">
            <Button variant="outline">View invoices</Button>
          </Link>
          <Link href="/clients/new">
            <Button variant="outline">Add client</Button>
          </Link>
          <Link href="/clients">
            <Button variant="outline">View clients</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
