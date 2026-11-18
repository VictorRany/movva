import Header from "@/components/Header";
import NavLink from "@/components/NavLink";

export default function StudentShell({ nutrition, children }: { nutrition?: boolean; children: React.ReactNode }) {
  const tabs = [
    ["/app", "🏋️", "Treino"],
    ...(nutrition ? [["/app/dieta", "🥗", "Dieta"]] : []),
    ["/app/evolucao", "📈", "Evolução"],
    ["/app/mensagens", "💬", "Chat"],
    ["/app/perfil", "👤", "Perfil"],
  ];
  return (
    <main className="pb-24">
      <Header />
      <div className="mx-auto max-w-3xl px-4">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 border-t border-navy-3 bg-navy-2/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around py-2">
          {tabs.map(([href, icon, label]) => <NavLink key={href} href={href} icon={icon} label={label} />)}
        </div>
      </nav>
    </main>
  );
}
