import { ArrowRightIcon } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/faqs";
import { cn } from "@/lib/utils";

type FaqAccordionProps = {
  className?: string;
};

export function FaqAccordion({ className }: FaqAccordionProps) {
  return (
    <div className={cn("divide-y divide-border rounded-xl border border-border bg-card", className)}>
      {FAQ_ITEMS.map((faq) => (
        <details key={faq.q} className="group px-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
            {faq.q}
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}
