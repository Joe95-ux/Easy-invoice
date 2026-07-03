import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import { getPusher, memberChannel } from "@/lib/pusher";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const formData = await request.text();
  const params = new URLSearchParams(formData);
  const socketId = params.get("socket_id");
  const channelName = params.get("channel_name");

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (channelName !== memberChannel(member.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: "Pusher not configured" }, { status: 503 });
  }

  const authResponse = pusher.authorizeChannel(socketId, channelName);

  return NextResponse.json(authResponse);
}
