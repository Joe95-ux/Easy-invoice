"use client";

import Link from "next/link";
import { ClipboardListIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pageHeaderActionClass } from "@/components/app-shell/page-header";
import { cn } from "@/lib/utils";

export function CreateDocumentMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className={cn(pageHeaderActionClass, "cursor-pointer")}>
            <PlusIcon className="size-4" />
            Create
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem render={<Link href="/invoices/new" />}>
          <FileTextIcon />
          New invoice
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/estimates/new" />}>
          <ClipboardListIcon />
          New estimate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
