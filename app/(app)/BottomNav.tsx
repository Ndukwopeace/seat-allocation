"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/app/generated/prisma/enums";

type Tab = {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  // A tab is "active" for its own path and everything nested under it.
  match: (pathname: string) => boolean;
};

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TABS: Record<Role, Tab[]> = {
  ADMIN: [
    {
      href: "/",
      label: "Dashboard",
      match: (p) => p === "/",
      icon: () => (
        <svg {...ICON_PROPS}>
          <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />
        </svg>
      ),
    },
    {
      href: "/students",
      label: "Students",
      match: (p) => p.startsWith("/students"),
      icon: () => (
        <svg {...ICON_PROPS}>
          <circle cx="9" cy="7" r="4" />
          <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
          <path d="M17 3.5a4 4 0 0 1 0 7.5" />
          <path d="M22 21v-2a4.5 4.5 0 0 0-3-4.2" />
        </svg>
      ),
    },
    {
      href: "/sessions",
      label: "Exams",
      match: (p) => p.startsWith("/sessions"),
      icon: () => (
        <svg {...ICON_PROPS}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/more",
      label: "More",
      match: (p) => p.startsWith("/more") || p.startsWith("/admin"),
      icon: () => (
        <svg {...ICON_PROPS}>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      ),
    },
  ],
  INVIGILATOR: [
    {
      href: "/",
      label: "Dashboard",
      match: (p) => p === "/",
      icon: () => (
        <svg {...ICON_PROPS}>
          <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />
        </svg>
      ),
    },
    {
      href: "/sessions",
      label: "Exams",
      match: (p) => p.startsWith("/sessions"),
      icon: () => (
        <svg {...ICON_PROPS}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/search",
      label: "Search",
      match: (p) => p.startsWith("/search"),
      icon: () => (
        <svg {...ICON_PROPS}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      ),
    },
    {
      href: "/more",
      label: "More",
      match: (p) => p.startsWith("/more"),
      icon: () => (
        <svg {...ICON_PROPS}>
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      ),
    },
  ],
};

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const tabs = TABS[role];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {tab.icon(active)}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
