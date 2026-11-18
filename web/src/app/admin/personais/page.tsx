import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { brl } from "@/lib/plans";
import { requireAdmin } from "@/lib/supabase/server";
import { createPersonal } from "../actions";
import PersonalForm from "./PersonalForm";

export default async function AdminPersonais({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  await requireAdmin();
  const d = await loadAdminData();
  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">Personais parceiros</h1>
      {erro && <div className="card mb-4 border-red-400 text-red-300">{erro}</div>}
      <div className="mb-8 grid gap-3 md:grid-cols-2">
        {d.personals.map((p) => {
          const load = d.loadOf(p.id);
          const owed = d.pendingOf(p.id).reduce((t, x) => t + Number(x.personal_amount), 0);
          return (
            <a key={p.id} href={`/admin/personais/${p.id}`} className={`card block hover:border-gold ${!p.active ? "opacity-50" : ""}`}>
              <div className="flex justify-between"><p className="font-bold">{p.name}</p><p className="text-sm text-gold">{brl(owed)} a repassar</p></div>
              <p className="text-sm text-muted">{d.cityName(p.city_id)} · {Number(p.commission_pct)}% · {[p.accepts_online && "online", p.accepts_presencial && "presencial"].filter(Boolean).join(" + ")}</p>
              <div className="mt-2 h-2 rounded bg-navy"><div className="h-2 rounded bg-gold" style={{ width: `${Math.min(100, (load / (p.max_students || 1)) * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-muted">{load}/{p.max_students} alunos {!p.contract_signed_at && <span className="text-red-300">· sem contrato</span>} {!p.active && "· inativo"}</p>
            </a>
          );
        })}
      </div>
      <section className="card">
        <h2 className="mb-1 text-lg font-bold text-gold">+ Cadastrar personal</h2>
        <p className="mb-4 text-sm text-muted">Ele recebe um e-mail para criar a senha e já entra no painel do personal. Gere o contrato a partir do modelo em Word e marque a data de assinatura.</p>
        <PersonalForm cities={d.cities} action={createPersonal} isNew />
      </section>
    </AdminShell>
  );
}
