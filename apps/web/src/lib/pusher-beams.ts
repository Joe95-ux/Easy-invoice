import "server-only";

type BeamsClient = Awaited<ReturnType<typeof createBeamsClient>>;

let beamsClient: BeamsClient | null = null;

async function createBeamsClient() {
  const PushNotifications = (await import("@pusher/push-notifications-server")).default;
  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID!;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY!;
  return new PushNotifications({ instanceId, secretKey });
}

export async function getBeamsClient() {
  if (beamsClient) return beamsClient;

  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;
  if (!instanceId || !secretKey) return null;

  beamsClient = await createBeamsClient();
  return beamsClient;
}

export function isBeamsConfigured(): boolean {
  return Boolean(
    process.env.PUSHER_BEAMS_INSTANCE_ID &&
    process.env.PUSHER_BEAMS_SECRET_KEY,
  );
}

export function beamsUserInterest(memberId: string) {
  return `member-${memberId}`;
}
