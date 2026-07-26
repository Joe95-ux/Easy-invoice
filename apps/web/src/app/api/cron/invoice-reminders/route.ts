import { NextResponse } from "next/server";
import { runInvoiceReminderJob } from "@/lib/reminders/service";
import { runEstimateReminderJob } from "@/lib/reminders/estimate-service";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/** Daily job: overdue invoices, payment reminders, expire estimates, estimate follow-ups. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [invoices, estimates] = await Promise.all([
      runInvoiceReminderJob(),
      runEstimateReminderJob(),
    ]);
    return NextResponse.json({ invoices, estimates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
