"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon, UploadIcon, UsersRoundIcon } from "lucide-react";
import { EmptyState } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { ImportClientsDialog } from "@/features/clients/components/import-clients-dialog";

export function ClientsEmptyState({ canWrite }: { canWrite: boolean }) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <EmptyState
        icon={UsersRoundIcon}
        title="No clients yet"
        description="Add a client once and reuse their details on every invoice — or import a CSV from your CRM."
        action={
          canWrite ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button render={<Link href="/clients/new" />}>
                <PlusIcon className="size-4" />
                Add your first client
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <UploadIcon className="size-4" />
                Import CSV
              </Button>
            </div>
          ) : undefined
        }
      />
      {canWrite ? (
        <ImportClientsDialog open={importOpen} onOpenChange={setImportOpen} />
      ) : null}
    </>
  );
}
