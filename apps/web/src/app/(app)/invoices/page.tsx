import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function InvoicesPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  const invoices = await prisma.invoice.findMany({
    where: { companyId: member.companyId },
    include: { client: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="mt-1 text-muted-foreground">Track and manage your invoices</p>
        </div>
        <Link
          href="/invoices/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          New invoice
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No invoices yet.</p>
          <Link
            href="/invoices/new"
            className="mt-4 inline-block text-sm font-medium text-primary"
          >
            Create your first invoice
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{invoice.number}</td>
                  <td className="px-4 py-3">{invoice.client?.name ?? "—"}</td>
                  <td className="px-4 py-3">{invoice.status}</td>
                  <td className="px-4 py-3">
                    {invoice.currency} {Number(invoice.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
