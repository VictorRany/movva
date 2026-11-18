"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const active = usePathname() === href;
  return (
    <Link href={href} className={`flex flex-col items-center px-3 py-1 text-xs ${active ? "text-gold" : "text-muted"}`}>
      <span className="text-xl">{icon}</span>{label}
    </Link>
  );
}
