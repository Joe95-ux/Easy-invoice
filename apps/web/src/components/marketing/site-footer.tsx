import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { AppLogo } from "@/components/app-logo";

const POLICY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AppLogo iconClassName="size-6" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Invoice Desk. Simple invoicing for small businesses.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <SignedOut>
              <Link href="/sign-in" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link href="/sign-up" className="transition-colors hover:text-foreground">
                Get started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="transition-colors hover:text-foreground">
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>

        <nav
          aria-label="Legal"
          className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border/60 pt-5 text-sm text-muted-foreground"
        >
          {POLICY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
