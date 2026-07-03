import "server-only";

let beamsClient: InstanceType<typeof import("@pusher/push-notifications-server").default> | null = null;

export async function getBeamsClient() {
  if (beamsClient) return beamsClient;

  const instanceId = process.env.PUSHER_BEAMS_INSTANCE_ID;
  const secretKey = process.env.PUSHER_BEAMS_SECRET_KEY;
  if (!instanceId || !secretKey) return null;

  const PushNotifications = (await import("@pusher/push-notifications-server")).default;
  beamsClient = new PushNotifications({ instanceId, secretKey });
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
