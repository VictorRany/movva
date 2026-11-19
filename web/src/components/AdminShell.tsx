import Header from "@/components/Header";
import { type IconName } from "@/components/Icon";
import NavLink from "@/components/NavLink";
import { logout } from "@/app/login/actions";

const NAV: [string, IconName, string][] = [["/admin", "chart", "Início"], ["/admin/alunos", "users", "Alunos"], ["/admin/personais", "dumbbell", "Personais"], ["/admin/influenciadores", "star", "Influencers"], ["/admin/cidades", "pin", "Cidades"], ["/admin/financeiro", "wallet", "Financeiro"]];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="pb-24">
      <Header right={<><span className="hidden rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold sm:inline">ADMIN</span><form action={logout}><button className="btn-ghost">Sair</button></form></>} />
      <div className="mx-auto max-w-6xl px-4">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-navy-3 bg-navy/95 backdrop-blur">
        <div className="safe-bottom mx-auto flex max-w-3xl justify-around pt-2">
          {NAV.map(([href, icon, label]) => <NavLink key={href} href={href} icon={icon} label={label} />)}
        </div>
      </nav>
    </main>
  );
}
