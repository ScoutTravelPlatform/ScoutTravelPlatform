"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "../actions/auth";

type IconName = "dashboard" | "clients" | "trips" | "quotes" | "tasks" | "communications" | "reports" | "team" | "billing" | "signout";

const navigation: Array<{ href: string; label: string; icon: IconName; active: (path: string) => boolean }> = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", active: (path) => path === "/dashboard" },
  { href: "/clients", label: "Clients", icon: "clients", active: (path) => path.startsWith("/clients") || path === "/add-client" },
  { href: "/trips", label: "Trips", icon: "trips", active: (path) => path.startsWith("/trips") },
  { href: "/quotes", label: "Quotes", icon: "quotes", active: (path) => path.startsWith("/quotes") },
  { href: "/tasks", label: "Tasks", icon: "tasks", active: (path) => path.startsWith("/tasks") },
  { href: "/communications", label: "Messages", icon: "communications", active: (path) => path.startsWith("/communications") },
  { href: "/reports", label: "Reports", icon: "reports", active: (path) => path.startsWith("/reports") },
  { href: "/team", label: "Team", icon: "team", active: (path) => path.startsWith("/team") },
  { href: "/billing", label: "Billing", icon: "billing", active: (path) => path.startsWith("/billing") },
];

export default function Sidebar() {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/intake/") ||
    pathname.startsWith("/join/")
  ) return null;

  return (
    <aside className="fixed inset-x-0 bottom-0 z-50 flex h-20 w-full shrink-0 items-center border-t border-slate-200 bg-white/95 px-2 py-2 text-slate-900 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur lg:sticky lg:inset-auto lg:top-0 lg:h-screen lg:w-64 lg:flex-col lg:items-stretch lg:border-r lg:border-t-0 lg:px-5 lg:py-5 lg:shadow-[4px_0_24px_rgba(15,23,42,0.03)]">
      <Link href="/dashboard" className="hidden items-center gap-3 px-2 lg:flex" aria-label="Scout dashboard">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0f6d78] text-white shadow-sm">
          <ScoutMark />
        </span>
        <span className="hidden lg:block">
          <span className="block text-xl font-bold leading-none tracking-tight text-[#243c57]">Scout</span>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#5a7780]">Travel Advisor</span>
        </span>
      </Link>

      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:mt-9 lg:block lg:space-y-1.5" aria-label="Advisor navigation">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-current={item.active(pathname) ? "page" : undefined}
            className={navClasses(item.active(pathname))}
          >
            <NavIcon name={item.icon} />
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        ))}
      </nav>

      <form action={signOutAction} className="ml-1 shrink-0 lg:ml-0 lg:mt-auto lg:pt-8">
        <button title="Sign out" aria-label="Sign out" className="flex w-full items-center justify-center gap-3 rounded-xl border border-transparent p-3 text-sm font-semibold text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800 lg:justify-start">
          <NavIcon name="signout" />
          <span className="hidden lg:inline">Sign out</span>
        </button>
      </form>
    </aside>
  );
}

function navClasses(active: boolean) {
  return `flex min-w-14 shrink-0 items-center justify-center gap-3 rounded-xl p-3 text-sm font-semibold transition lg:min-w-0 lg:justify-start ${
    active
      ? "bg-[#dceff0] text-[#0f6d78]"
      : "text-slate-500 hover:bg-slate-50 hover:text-[#0f6d78]"
  }`;
}

function ScoutMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3Z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function NavIcon({ name }: { name: IconName }) {
  const common = "h-5 w-5 shrink-0";
  if (name === "dashboard") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z" /></svg>;
  if (name === "clients") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 0 1 3 3v1m-4-9a3 3 0 0 1 0 5.8" /></svg>;
  if (name === "trips") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m3 16 18-7-7 12-2.3-6.7L3 16Zm8.7-1.7L21 9M7 8l3-5 2 7" /></svg>;
  if (name === "quotes") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M6 3h9l4 4v14H6V3Z" /><path d="M15 3v5h4M9 12h7M9 16h5" /></svg>;
  if (name === "tasks") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" /></svg>;
  if (name === "communications") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 5h16v12H8l-4 3V5Z" /><path d="m6 8 6 4 6-4" /></svg>;
  if (name === "reports") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
  if (name === "team") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>;
  if (name === "billing") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 9h18M7 15h4" /></svg>;
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg>;
}
