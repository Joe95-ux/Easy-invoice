import { prisma } from "@/lib/db";

export type ProcessSetupItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export type ProcessSetupSnapshot = {
  items: ProcessSetupItem[];
  completed: number;
  total: number;
};

export async function getProcessSetupSnapshot(
  companyId: string,
): Promise<ProcessSetupSnapshot> {
  const [
    clientCount,
    productCount,
    sentInvoiceCount,
    recurringCount,
    company,
  ] = await Promise.all([
    prisma.client.count({ where: { companyId } }),
    prisma.product.count({ where: { companyId } }),
    prisma.invoice.count({
      where: {
        companyId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
    }),
    prisma.recurringInvoice.count({ where: { companyId } }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        stripeConnectedAccountId: true,
        stripeConnectChargesEnabled: true,
        stripeConnectDetailsSubmitted: true,
        remindersEnabled: true,
        clientPaymentPlansEnabled: true,
      },
    }),
  ]);

  const stripeReady = Boolean(
    company?.stripeConnectedAccountId &&
      company.stripeConnectChargesEnabled &&
      company.stripeConnectDetailsSubmitted,
  );

  const items: ProcessSetupItem[] = [
    {
      id: "client",
      label: "Add a client",
      description: "Reusable billing details for invoices and estimates.",
      href: "/clients/new",
      done: clientCount > 0,
    },
    {
      id: "invoice",
      label: "Send your first invoice",
      description: "Create, preview, and email a PDF — or share a payment link.",
      href: "/invoices/new",
      done: sentInvoiceCount > 0,
    },
    {
      id: "stripe",
      label: "Enable card payments",
      description: "Connect Stripe so clients can pay online from the invoice.",
      href: "/settings/billing",
      done: stripeReady,
    },
    {
      id: "reminders",
      label: "Confirm payment reminders",
      description: "Automatic nudges before and after the due date.",
      href: "/settings/general#settings-reminders",
      done: Boolean(company?.remindersEnabled),
    },
    {
      id: "products",
      label: "Save a product or service",
      description: "Reuse line items instead of retyping every invoice.",
      href: "/products",
      done: productCount > 0,
    },
    {
      id: "recurring",
      label: "Set up a recurring schedule",
      description: "For retainers and subscriptions — based on an existing invoice.",
      href: "/recurring-invoices",
      done: recurringCount > 0,
    },
  ];

  const completed = items.filter((item) => item.done).length;

  return { items, completed, total: items.length };
}
