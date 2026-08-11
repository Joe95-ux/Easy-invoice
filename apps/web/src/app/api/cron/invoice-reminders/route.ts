import { NextResponse } from "next/server";
import { runInvoiceReminderJob } from "@/lib/reminders/service";
import { runEstimateReminderJob } from "@/lib/reminders/estimate-service";
import { runRecurringInvoiceJob } from "@/lib/recurring-invoices";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/** Daily job: overdue invoices, payment reminders, expire estimates, recurring invoices. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [invoices, estimates, recurring] = await Promise.all([
      runInvoiceReminderJob(),
      runEstimateReminderJob(),
      runRecurringInvoiceJob(),
    ]);
    return NextResponse.json({ invoices, estimates, recurring });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
