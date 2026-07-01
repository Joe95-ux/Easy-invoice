import { AcceptInvitePage } from "@/features/team/components/accept-invite-page";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function AcceptInviteRoute({ params }: PageProps) {
  const { token } = await params;
  return <AcceptInvitePage token={token} />;
}
