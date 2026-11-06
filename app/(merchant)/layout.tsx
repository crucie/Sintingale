import { AppShell } from "@/components/layout/AppShell";

export default function MerchantLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
