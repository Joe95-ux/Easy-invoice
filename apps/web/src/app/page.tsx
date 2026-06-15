import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Easy Invoice</span>
          <nav className="flex items-center gap-4">
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-medium text-primary">Invoicing made easy</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Describe the job. Send the invoice.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Create professional invoices in any language — by form or by simply
            describing the work. Built for handymen, cleaners, and small businesses
            who want to get paid without the paperwork headache.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
            >
              Start for free
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
