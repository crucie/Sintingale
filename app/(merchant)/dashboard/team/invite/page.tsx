import type { Metadata } from "next";
import { InviteForm } from "@/components/org/InviteForm";

export const metadata: Metadata = { title: "Invite teammate" };

export default function InvitePage() {
  return <InviteForm />;
}
