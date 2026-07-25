/** Shared helpers for sectioned estimate/invoice line items. */

export type SectionableLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
  sortOrder?: number;
  sectionTitle?: string | null;
  sectionSortOrder?: number;
  timeEntryIds?: string[];
};

export type LineItemSectionInput<TItem = SectionableLineItem> = {
  /** Client-side key for React lists. */
  key: string;
  title: string;
  items: TItem[];
};

export type FlattenedLineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
  sectionTitle: string | null;
  sectionSortOrder: number;
  timeEntryIds?: string[];
};

function newSectionKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sec_${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptySection<TItem>(
  createItem: () => TItem,
  title = "",
): LineItemSectionInput<TItem> {
  return {
    key: newSectionKey(),
    title,
    items: [createItem()],
  };
}

type CleanItem<TItem extends SectionableLineItem> = Omit<
  TItem,
  "sectionTitle" | "sectionSortOrder" | "sortOrder" | "amount"
>;

/** Group persisted/flat items into ordered sections (preserves section + item order). */
export function groupLineItemsIntoSections<TItem extends SectionableLineItem>(
  items: TItem[],
): LineItemSectionInput<CleanItem<TItem>>[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    const sectionDiff = (a.sectionSortOrder ?? 0) - (b.sectionSortOrder ?? 0);
    if (sectionDiff !== 0) return sectionDiff;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  const map = new Map<number, { title: string; items: CleanItem<TItem>[] }>();

  for (const item of sorted) {
    const order = item.sectionSortOrder ?? 0;
    const title = item.sectionTitle?.trim() ?? "";
    const {
      sectionTitle: _t,
      sectionSortOrder: _s,
      sortOrder: _o,
      amount: _a,
      ...rest
    } = item;
    const existing = map.get(order);
    if (existing) {
      if (!existing.title && title) existing.title = title;
      existing.items.push(rest as CleanItem<TItem>);
    } else {
      map.set(order, { title, items: [rest as CleanItem<TItem>] });
    }
  }

  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, section]) => ({
      key: newSectionKey(),
      title: section.title,
      items: section.items,
    }));
}

/** Flatten editor sections into API line items with section metadata. */
export function flattenSectionsToLineItems<
  TItem extends {
    description: string;
    quantity: number;
    unitPrice: number;
    timeEntryIds?: string[];
  },
>(sections: LineItemSectionInput<TItem>[]): FlattenedLineItemInput[] {
  const result: FlattenedLineItemInput[] = [];
  let sortOrder = 0;

  sections.forEach((section, sectionSortOrder) => {
    const title = section.title.trim() || null;
    for (const item of section.items) {
      result.push({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: sortOrder++,
        sectionTitle: title,
        sectionSortOrder,
        ...(item.timeEntryIds?.length ? { timeEntryIds: item.timeEntryIds } : {}),
      });
    }
  });

  return result;
}

export function sectionSubtotal(
  items: Array<{ quantity: number; unitPrice: number }>,
): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

/** True when any section has a non-empty title (documents should render section chrome). */
export function hasNamedSections(
  items: Array<{ sectionTitle?: string | null }>,
): boolean {
  return items.some((item) => Boolean(item.sectionTitle?.trim()));
}
