import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { normalizeClerkRedirectUrl } from "@/lib/clerk-redirect";

type SignUpPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const { userId } = await auth();
  const { redirect_url: redirectUrl } = await searchParams;
  const afterSignUp = normalizeClerkRedirectUrl(
    redirectUrl,
    "/onboarding",
  );

  if (userId) redirect(afterSignUp);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl={afterSignUp}
        forceRedirectUrl={afterSignUp}
      />
    </div>
  );
}
