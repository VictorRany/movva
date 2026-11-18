import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { brl, getPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/supabase/server";

export default async function AdminHome() {
  await requireAdmin();
  const d = await loadAdminData();
  const month = new Date().toISOString().slice(0, 7);
  const monthPays = d.approved.filter((p) => p.paid_at.slice(0, 7) === month);
  const revenue = monthPays.reduce((t, p) => t + Number(p.amount), 0);
  const commissions = monthPays.reduce((t, p) => t + Number(p.personal_amount ?? 0), 0);
  const mrr = d.active.reduce((t, s) => t + (getPlan(s.plan)?.price ?? 0), 0);
  const owed = d.approved.filter((p) => !p.payout_id && p.personal_id).reduce((t, p) => t + Number(p.personal_amount), 0);
  const queue = d.active.filter((s) => !s.personal_id);
  const noContract = d.personals.filter((p) => p.active && !p.contract_signed_at);
  const fullPersonals = d.personals.filter((p) => p.active && d.loadOf(p.id) >= (p.max_students ?? 50) * 0.9);

  const byCity = [...d.cities.map((c) => ({ key: c.id, label: `${c.name}/${c.state}` })), { key: null, label: "Sem cidade / outras" }].map((c) => ({
    ...c, alunos: d.active.filter((s) => (s.city_id ?? null) === c.key).length, personais: d.personals.filter((p) => p.active && (p.city_id ?? null) === c.key).length,
  })).filter((c) => c.alunos || c.personais);

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">Visão geral</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[d.active.length, "alunos ativos"], [brl(mrr), "receita recorrente (MRR)"], [brl(revenue), "recebido este mês"], [brl(revenue - commissions), "margem Movva no mês"],
          [d.personals.filter((p) => p.active).length, "personais ativos"], [d.cities.filter((c) => c.active).length, "cidades ativas"], [brl(owed), "a repassar aos personais"], [brl(commissions), "comissões do mês"]].map(([v, l]) => (
          <div key={String(l)} className="card p-4"><p className="text-2xl font-extrabold text-gold">{v}</p><p className="text-sm text-muted">{l}</p></div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Atenção</h2>
      <div className="space-y-2">
        {!queue.length && !noContract.length && !fullPersonals.length && <p className="text-muted">Tudo em dia ✅</p>}
        {!!queue.length && <a href="/admin/alunos?f=fila" className="card block border-red-400">🚨 <b>{queue.length} aluno(s) pagante(s) sem personal</b> — nenhum personal disponível para eles. Atribua manualmente.</a>}
        {noContract.map((p) => <a key={p.id} href={`/admin/personais/${p.id}`} className="card block">📄 {p.name} está ativo sem data de contrato assinado.</a>)}
        {fullPersonals.map((p) => <a key={p.id} href={`/admin/personais/${p.id}`} className="card block">⚠ {p.name} está com {d.loadOf(p.id)}/{p.max_students} alunos — perto do limite. Hora de recrutar.</a>)}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Por cidade</h2>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="text-left text-muted"><tr><th className="p-3">Cidade</th><th className="p-3">Alunos ativos</th><th className="p-3">Personais</th></tr></thead>
          <tbody>{byCity.map((c) => <tr key={c.label} className="border-t border-navy-3"><td className="p-3">{c.label}</td><td className="p-3">{c.alunos}</td><td className="p-3">{c.personais}</td></tr>)}</tbody>
        </table>
      </div>
    </AdminShell>
  );
}
