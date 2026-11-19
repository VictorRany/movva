import Header from "@/components/Header";
import { type IconName } from "@/components/Icon";
import NavLink from "@/components/NavLink";

export default function StudentShell({ nutrition, children }: { nutrition?: boolean; children: React.ReactNode }) {
  const tabs: [string, IconName, string][] = [
    ["/app", "dumbbell", "Treino"],
    ...(nutrition ? [["/app/dieta", "food", "Dieta"] as [string, IconName, string]] : []),
    ["/app/evolucao", "line", "Evolução"],
    ["/app/mensagens", "chat", "Chat"],
    ["/app/perfil", "user", "Perfil"],
  ];
  return (
    <main className="pb-24">
      <Header />
      <div className="mx-auto max-w-3xl px-4">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-navy-3 bg-navy/95 backdrop-blur">
        <div className="safe-bottom mx-auto flex max-w-3xl justify-around pt-2">
          {tabs.map(([href, icon, label]) => <NavLink key={href} href={href} icon={icon} label={label} />)}
        </div>
      </nav>
    </main>
  );
}
