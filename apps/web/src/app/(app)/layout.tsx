import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getCurrentMember } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              Easy Invoice
            </Link>
            <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/invoices" className="hover:text-foreground">
                Invoices
              </Link>
              <Link href="/clients" className="hover:text-foreground">
                Clients
              </Link>
              <Link href="/settings" className="hover:text-foreground">
                Settings
              </Link>
            </nav>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
