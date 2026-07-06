"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InfoIcon, Loader2Icon, MailIcon, UserRoundPlusIcon, XIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABELS, roleBadgeVariant, type TeamData } from "@/features/team/types";
import { canManageTeam, ROLE_DESCRIPTIONS } from "@/lib/team";
import type { UserRole } from "@/lib/db";

const INVITE_ROLE_ITEMS = [
  { value: "MEMBER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
] as const;

const MEMBER_ROLE_ITEMS = [
  { value: "MEMBER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
] as const;

export const MEMBERS_INFO =
  "Invite teammates and control who can manage company settings. Owners assign admin or member roles; admins can invite and remove members only.";

function RolePrivilegeBadge({ role }: { role: UserRole }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex cursor-pointer items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${ROLE_LABELS[role]} privileges`}
          />
        }
      >
        <Badge variant={roleBadgeVariant(role)}>{ROLE_LABELS[role]}</Badge>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-72 gap-0">
        <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
        <p className="mt-1 text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
      </PopoverContent>
    </Popover>
  );
}

type TeamManagementPanelProps = {
  initialData: TeamData;
};

export function TeamManagementPanel({ initialData }: TeamManagementPanelProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamData["members"][number] | null>(null);

  const canManage = canManageTeam(data.currentRole);
  const canInviteAdmin = data.currentRole === "OWNER";

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  async function refreshTeam() {
    const response = await fetch("/api/company/team");
    if (!response.ok) return;
    const body = (await response.json()) as TeamData;
    setData(body);
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setInviting(true);
    try {
      const response = await fetch("/api/company/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to send invite");

      toast.success(`Invite sent to ${email.trim()}`);
      setEmail("");
      await refreshTeam();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function cancelInvite(inviteId: string) {
    setBusyId(inviteId);
    try {
      const response = await fetch(`/api/company/invites/${inviteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to cancel invite");
      toast.success("Invite cancelled");
      await refreshTeam();
    } catch {
      toast.error("Could not cancel invite");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(memberId: string) {
    setBusyId(memberId);
    try {
      const response = await fetch(`/api/company/members/${memberId}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to remove member");
      toast.success("Access revoked");
      setMemberToRemove(null);
      await refreshTeam();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove member");
    } finally {
      setBusyId(null);
    }
  }

  async function updateMemberRole(memberId: string, newRole: "ADMIN" | "MEMBER") {
    setBusyId(memberId);
    try {
      const response = await fetch(`/api/company/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to update role");
      toast.success("Role updated");
      await refreshTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    } finally {
      setBusyId(null);
    }
  }

  const inviteRoleItems = canInviteAdmin
    ? INVITE_ROLE_ITEMS
    : INVITE_ROLE_ITEMS.filter((item) => item.value === "MEMBER");

  return (
    <div className="space-y-6">
      {canManage && (
        <form
          onSubmit={handleInvite}
          className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4"
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserRoundPlusIcon className="size-4 text-primary" />
            Invite team member
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="bookkeeper@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as "ADMIN" | "MEMBER")}
                items={inviteRoleItems}
              >
                <SelectTrigger id="invite-role" className="mb-0 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {inviteRoleItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting} className="w-full cursor-pointer sm:w-auto">
              {inviting ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Sending…
                </>
              ) : (
                "Send invite"
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
        </form>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Members</h3>
          <span className="text-xs text-muted-foreground">
            {data.members.length} member{data.members.length === 1 ? "" : "s"}
          </span>
        </div>
        <Table stickyColumnWidths={["12rem", "7rem"]}>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {canManage && <TableHead className="w-32 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((member) => {
              const isBusy = busyId === member.id;
              const canEdit =
                canManage &&
                member.role !== "OWNER" &&
                !member.isCurrentUser &&
                (data.currentRole === "OWNER" ||
                  (data.currentRole === "ADMIN" && member.role === "MEMBER"));

              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{member.email}</span>
                      {member.isCurrentUser && (
                        <Badge variant="outline" className="text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {canEdit && data.currentRole === "OWNER" ? (
                      <div className="space-y-1">
                        <Select
                          value={member.role === "ADMIN" ? "ADMIN" : "MEMBER"}
                          disabled={isBusy}
                          onValueChange={(value) =>
                            updateMemberRole(member.id, value as "ADMIN" | "MEMBER")
                          }
                          items={MEMBER_ROLE_ITEMS}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_ROLE_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <RolePrivilegeBadge role={member.role} />
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {canEdit && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="cursor-pointer"
                          disabled={isBusy}
                          aria-label={`Revoke access for ${member.email}`}
                          onClick={() => setMemberToRemove(member)}
                        >
                          {isBusy ? (
                            <Loader2Icon className="animate-spin" />
                          ) : (
                            <XIcon />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {data.invites.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Pending invites</h3>
          <Table stickyColumnWidths={["12rem", "7rem"]}>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Expires</TableHead>
                {canManage && <TableHead className="w-20 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MailIcon className="size-3.5 text-muted-foreground" />
                      {invite.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RolePrivilegeBadge role={invite.role} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        disabled={busyId === invite.id}
                        aria-label={`Cancel invite for ${invite.email}`}
                        onClick={() => cancelInvite(invite.id)}
                      >
                        {busyId === invite.id ? (
                          <Loader2Icon className="animate-spin" />
                        ) : (
                          <XIcon />
                        )}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !busyId) setMemberToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke access?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove && (
                <>
                  <strong>{memberToRemove.email}</strong> will lose access to this company
                  immediately. They won&apos;t be able to view or manage invoices, clients, or
                  other company data unless invited again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === memberToRemove?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busyId === memberToRemove?.id}
              onClick={() => {
                if (memberToRemove) void removeMember(memberToRemove.id);
              }}
            >
              {busyId === memberToRemove?.id ? "Revoking…" : "Revoke access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function MembersInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="About team members"
          />
        }
      >
        <InfoIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={6} className="w-80 gap-3">
        <p className="text-sm text-muted-foreground">{MEMBERS_INFO}</p>
        <div className="space-y-2 border-t border-border pt-3">
          {(Object.keys(ROLE_DESCRIPTIONS) as UserRole[]).map((role) => (
            <div key={role}>
              <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
              <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
