export type PortalAccountOption = {
  clientId: string;
  clientName: string;
  companyId: string;
  companyName: string;
  isCurrent: boolean;
};

export type PortalInvoiceListItem = {
  id: string;
  number: string;
  status: string;
  total: number;
  balanceDue: number;
  currency: string;
  dueDate: string | null;
  issuedAt: string;
  href: string;
};

export type PortalEstimateListItem = {
  id: string;
  number: string;
  status: string;
  total: number;
  currency: string;
  validUntil: string | null;
  issuedAt: string;
  href: string;
};
