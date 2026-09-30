import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { normalizeClerkRedirectUrl } from "@/lib/clerk-redirect";

type SignInPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { userId } = await auth();
  const { redirect_url: redirectUrl } = await searchParams;
  const afterSignIn = normalizeClerkRedirectUrl(redirectUrl);

  // Avoid client-side redirect loops when a session already exists.
  if (userId) redirect(afterSignIn);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={afterSignIn}
        forceRedirectUrl={afterSignIn}
      />
    </div>
  );
}
