"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field, Input, Select } from "@/components/ui/Field";
import { orgActions, randomId, useSigner } from "@/lib/client/org";
import { formatDate } from "@/lib/format";
import type { Role } from "@/lib/schema";
import type { OrgDTO } from "@/lib/types";
import { OrgGate } from "./OrgGate";

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+/, "").slice(0, 40);

function Form({ org }: { org: OrgDTO }) {
  const qc = useQueryClient();
  const sign = useSigner();
  const [label, setLabel] = useState("");
  const [invitee, setInvitee] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ link: string; expiresAt: number; subname: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (invitee && !/^0x[0-9a-fA-F]{40}$/.test(invitee)) {
      toast.error("Enter a valid wallet address, or leave it empty");
      return;
    }
    setBusy(true);
    try {
      const { invite, link } = await orgActions.createInvite(sign, {
        orgId: org.orgId,
        inviteId: randomId("inv"),
        inviteeAddress: invitee.toLowerCase(),
        label,
        role,
        createdAt: Math.floor(Date.now() / 1000),
      });
      setResult({ link, expiresAt: invite.expiresAt, subname: invite.subname });
      qc.invalidateQueries({ queryKey: ["invites"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message.split("\n")[0] : "Could not create invite");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-xl p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-3 font-display text-xl font-semibold">Invite for {result.subname} is live</h2>
        <p className="mt-1 text-sm text-fg-muted">It expires on its own at {formatDate(result.expiresAt)}. No cleanup needed.</p>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-left">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{result.link}</p>
          <CopyButton value={result.link} label="Copy link" toastMessage="Invite link copied" showLabel />
        </div>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" onClick={() => setResult(null)}>
            Invite another
          </Button>
          <ButtonLink href="/dashboard/team">Back to team</ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-xl p-6">
      <form onSubmit={submit} className="grid gap-5">
        <Field label="Subname" htmlFor="label" hint={label ? `They will become ${label}.${org.ensName}` : "Lowercase letters, numbers and dashes."}>
          <div className="flex items-center rounded-xl border border-border bg-bg focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft">
            <input
              id="label"
              required
              value={label}
              onChange={(e) => setLabel(slug(e.target.value))}
              placeholder="alice"
              className="h-11 min-w-0 flex-1 rounded-xl bg-transparent px-3.5 text-sm text-fg outline-none"
            />
            <span className="pr-3.5 text-sm text-fg-muted">.{org.ensName}</span>
          </div>
        </Field>
        <Field label="Invitee wallet (optional)" htmlFor="invitee" hint="Only this wallet can accept. Leave empty to let anyone with the link accept.">
          <Input id="invitee" className="font-mono" value={invitee} onChange={(e) => setInvitee(e.target.value.trim())} placeholder="0x…" />
        </Field>
        <Field label="Role" htmlFor="role">
          <Select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="member">Member: sees their projects and claims their share</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Button type="submit" loading={busy} icon={<UserPlus className="size-4" />}>
          Sign and create invite
        </Button>
      </form>
    </Card>
  );
}

export function InviteForm() {
  return (
    <>
      <PageHeader title="Invite a teammate" description="Invites are expiring records: unused links stop working after 48 hours." />
      <OrgGate>{({ org }) => <Form org={org} />}</OrgGate>
    </>
  );
}
