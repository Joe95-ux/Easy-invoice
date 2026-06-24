"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { invoiceDraftSchema, type InvoiceDraft } from "@/lib/schemas/invoice";

type AiInvoiceTabProps = {
  onDraft: (draft: InvoiceDraft) => void;
};

export function AiInvoiceTab({ onDraft }: AiInvoiceTabProps) {
  const [aiText, setAiText] = useState("");
  const [parsing, setParsing] = useState(false);

  async function handleParse() {
    setParsing(true);
    try {
      const response = await fetch("/api/ai/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      if (!response.ok) throw new Error("Failed to parse invoice text");
      onDraft(invoiceDraftSchema.parse(await response.json()));
      toast.success("AI draft applied — review before saving.");
    } catch {
      toast.error("Could not parse that description. Try again or use the form.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Describe the job</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          rows={6}
          placeholder="Example: Fixed Maria's kitchen sink, 2 hours at $85/hr, parts $45, due in 14 days..."
        />
        <Button onClick={handleParse} disabled={parsing || !aiText.trim()}>
          {parsing ? "Parsing..." : "Parse with AI"}
        </Button>
      </CardContent>
    </Card>
  );
}
