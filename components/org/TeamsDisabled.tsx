import { Settings, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/** Shown on every team page while the optional Teams & ENS feature is off. */
export function TeamsDisabled({ publicView = false }: { publicView?: boolean }) {
  return (
    <Card className="mx-auto max-w-xl p-6 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted text-fg-muted">
        <Users className="size-6" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold text-fg">Teams &amp; ENS are turned off</h2>
      <p className="mt-2 text-sm text-fg-muted">
        {publicView
          ? "This seller has not enabled teams, so team invites are unavailable."
          : "This is an optional feature. Products, invoices and checkout work without it. Turn it on in Settings to link an ENS name, invite teammates, split project revenue and authorise agents."}
      </p>
      {!publicView ? (
        <ButtonLink href="/dashboard/settings" className="mt-5" icon={<Settings className="size-4" aria-hidden />}>
          Open settings
        </ButtonLink>
      ) : null}
    </Card>
  );
}
