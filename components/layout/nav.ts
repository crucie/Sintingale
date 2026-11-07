import {
  Bot,
  Building2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Part of the optional Teams & ENS feature; hidden while it is off. */
  teams?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Billing",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/products", label: "Products", icon: Package },
      { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/dashboard/org", label: "Organisation", icon: Building2, teams: true },
      { href: "/dashboard/team", label: "Team", icon: Users, teams: true },
      { href: "/dashboard/projects", label: "Projects", icon: FolderKanban, teams: true },
      { href: "/dashboard/agents", label: "Agents", icon: Bot, teams: true },
    ],
  },
  {
    label: "You",
    items: [
      { href: "/me/earnings", label: "Earnings", icon: Wallet, teams: true },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

const byHref = (href: string) => NAV.find((n) => n.href === href)!;

export function navGroupsFor(teams: boolean): NavGroup[] {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => teams || !i.teams) })).filter((g) => g.items.length);
}

/** Bottom tab bar on phones; everything else lives in the drawer. */
export function tabsFor(teams: boolean): NavItem[] {
  return teams
    ? [byHref("/dashboard"), byHref("/dashboard/invoices"), byHref("/dashboard/projects"), byHref("/dashboard/team")]
    : [byHref("/dashboard"), byHref("/dashboard/products"), byHref("/dashboard/invoices"), byHref("/dashboard/settings")];
}

export const isActive = (pathname: string, item: NavItem) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
