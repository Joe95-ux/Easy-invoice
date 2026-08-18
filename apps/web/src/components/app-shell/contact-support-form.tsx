"use client";

import { useEffect, useState } from "react";
import { ChevronLeftIcon, CornerDownLeftIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_TOPICS } from "@/lib/schemas/contact";
import { SUPPORT_EMAIL } from "@/lib/support";
import { cn } from "@/lib/utils";

const contactTopicItems = CONTACT_TOPICS.map((topic) => ({
  value: topic.value,
  label: topic.label,
}));

const sendButtonClassName = cn(
  "h-9 rounded-xl border-transparent px-4 shadow-none",
  "bg-primary text-primary-foreground hover:bg-primary/90",
  "disabled:bg-primary/50 disabled:text-primary-foreground/80",
  "dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100",
  "dark:disabled:bg-white/70 dark:disabled:text-neutral-900/60",
);

export function SendShortcutButton({
  sending,
  disabled,
  onClick,
}: {
  sending: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const [metaLabel, setMetaLabel] = useState("Ctrl");

  useEffect(() => {
    const isMac = /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
    if (isMac) setMetaLabel("\u2318");
  }, []);

  return (
    <Button type="button" onClick={onClick} disabled={disabled} className={sendButtonClassName}>
      {sending ? (
        <>
          <Loader2Icon className="animate-spin" />
          Sending...
        </>
      ) : (
        <>
          Send
          <KbdGroup className="ml-1.5">
            <Kbd
              className={cn(
                "rounded-md border-0 px-1.5 text-[11px] font-medium",
                "bg-primary-foreground/15 text-primary-foreground",
                "dark:bg-neutral-200 dark:text-neutral-700",
              )}
            >
              {metaLabel}
            </Kbd>
            <Kbd
              className={cn(
                "rounded-md border-0 px-1 text-primary-foreground",
                "bg-primary-foreground/15",
                "dark:bg-neutral-200 dark:text-neutral-700",
              )}
            >
              <CornerDownLeftIcon className="size-3" />
            </Kbd>
          </KbdGroup>
        </>
      )}
    </Button>
  );
}

type ContactSupportFormProps = {
  onSent?: () => void;
  /** When set, shows a “Back to FAQs” control (help sheet). */
  onBackToFaqs?: () => void;
  /** Prefix for field ids when multiple forms may mount. */
  idPrefix?: string;
  /** Hide the default intro paragraph (e.g. when a dialog already describes it). */
  showIntro?: boolean;
  className?: string;
};

export function ContactSupportForm({
  onSent,
  onBackToFaqs,
  idPrefix = "contact",
  showIntro = true,
  className,
}: ContactSupportFormProps) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0].value);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const canSend = subject.trim().length >= 3 && message.trim().length >= 10 && !sending;

  async function handleSend() {
    if (!canSend) return;

    setSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          topic,
          message: message.trim(),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof body.error === "string" ? body.error : "Failed to send message");
      }

      toast.success("Message sent — we'll get back to you soon.");
      setSubject("");
      setTopic(CONTACT_TOPICS[0].value);
      setMessage("");
      onSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSend();
    }
  }

  const topicId = `${idPrefix}-topic`;
  const subjectId = `${idPrefix}-subject`;
  const messageId = `${idPrefix}-message`;

  return (
    <div className={cn("flex flex-1 flex-col gap-4", className)}>
      {onBackToFaqs ? (
        <button
          type="button"
          onClick={onBackToFaqs}
          className="flex w-fit cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          Back to FAQs
        </button>
      ) : null}

      {showIntro ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Did not find what you need? Send us a message and the Invoice Desk team will reply to your
          account email at {SUPPORT_EMAIL}.
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={topicId}>Topic</Label>
        <Select
          value={topic}
          onValueChange={(value) => {
            if (value) setTopic(value);
          }}
          items={contactTopicItems}
        >
          <SelectTrigger id={topicId} className="w-full rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {contactTopicItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={subjectId}>Subject</Label>
        <Input
          id={subjectId}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Brief summary of your question"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={messageId}>Message</Label>
        <Textarea
          id={messageId}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={8}
          placeholder="Tell us what you are trying to do or what went wrong..."
          className="min-h-[160px] resize-none rounded-xl"
        />
      </div>

      <div className="flex justify-end">
        <SendShortcutButton
          sending={sending}
          disabled={!canSend}
          onClick={() => void handleSend()}
        />
      </div>
    </div>
  );
}
