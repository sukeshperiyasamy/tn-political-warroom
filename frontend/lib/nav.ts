import {
  LayoutDashboard,
  Newspaper,
  TrendingUp,
  FlaskConical,
  FileText,
  GitCompare,
  Sparkles,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  tamilLabel: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Monitor",
    items: [
      {
        href: "/",
        label: "Overview",
        tamilLabel: "முதன்மை சுருக்கம்",
        description: "Coverage volume, party share of voice and sentiment at a glance.",
        icon: LayoutDashboard,
      },
      {
        href: "/news",
        label: "News Feed",
        tamilLabel: "செய்தி ஓட்டம்",
        description: "Filterable live wire from monitored Tamil and national outlets.",
        icon: Newspaper,
      },
      {
        href: "/trending",
        label: "Trending Now",
        tamilLabel: "சமூக ஊடகப் போக்குகள்",
        description: "What is rising across social platforms right now.",
        icon: TrendingUp,
        badge: "Live",
      },
    ],
  },
  {
    label: "Analyse",
    items: [
      {
        href: "/brief",
        label: "Intelligence Brief",
        tamilLabel: "அரசியல் அறிக்கை",
        description: "AI-written strategic brief with narratives and recommended actions.",
        icon: FileText,
      },
      {
        href: "/compare",
        label: "Party Compare",
        tamilLabel: "கட்சி ஒப்பீடு",
        description: "Benchmark up to four parties or leaders side by side.",
        icon: GitCompare,
      },
      {
        href: "/lab",
        label: "Discovery Lab",
        tamilLabel: "கதைப்பரவல் ஆய்வுக்கூடம்",
        description: "Explore emerging narratives and how they spread.",
        icon: FlaskConical,
        badge: "Lab",
      },
    ],
  },
  {
    label: "Create",
    items: [
      {
        href: "/studio",
        label: "Card Studio",
        tamilLabel: "அட்டை ஸ்டுடியோ",
        description: "Design and export 1080×1080 branded Tamil news cards.",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Manage",
    items: [
      {
        href: "/admin",
        label: "Admin",
        tamilLabel: "நிர்வாகம்",
        description: "Sources, keywords, ingestion and client settings.",
        icon: ShieldCheck,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function findNavItem(pathname: string): NavItem {
  const exact = NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact;
  const prefix = NAV_ITEMS.filter((i) => i.href !== "/").find((i) => pathname.startsWith(i.href));
  return prefix ?? NAV_ITEMS[0];
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
