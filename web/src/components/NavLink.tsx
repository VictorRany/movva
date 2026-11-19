"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";

export default function NavLink({ href, icon, label }: { href: string; icon: IconName; label: string }) {
  const path = usePathname();
  const active = href === "/app" || href === "/admin" ? path === href : path.startsWith(href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 py-1.5 text-[11px] font-medium tracking-wide transition-colors ${active ? "text-gold" : "text-muted hover:text-cream"}`}>
      {active && <span className="absolute -top-2 h-0.5 w-8 rounded-full bg-gold" />}
      <Icon name={icon} size={22} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
