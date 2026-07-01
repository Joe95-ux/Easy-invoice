import { SignIn } from "@clerk/nextjs";

type SignInPageProps = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect_url: redirectUrl } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignIn forceRedirectUrl={redirectUrl} />
    </div>
  );
}
