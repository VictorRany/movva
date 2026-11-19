import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { brl, getPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/supabase/server";
import { resendAccess, transferStudents, updatePersonal } from "../../actions";
import PersonalForm from "../PersonalForm";

export default async function AdminPersonal({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  await requireAdmin();
  const d = await loadAdminData();
  const p = d.personals.find((x) => x.id === id);
  if (!p) return <AdminShell><p>Personal não encontrado.</p></AdminShell>;
  const students = d.active.filter((s) => s.personal_id === id);
  const pending = d.pendingOf(id);
  const owed = pending.reduce((t, x) => t + Number(x.personal_amount), 0);
  const total = d.approved.filter((x) => x.personal_id === id).reduce((t, x) => t + Number(x.personal_amount), 0);

  return (
    <AdminShell>
      <Link href="/admin/personais" className="text-sm text-muted">← Personais</Link>
      <h1 className="mb-1 text-2xl font-bold">{p.name}</h1>
      <p className="mb-4 text-muted">{p.email} · desde {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
      {ok && <div className="card mb-4 border-gold">✅ {ok}</div>}
      {erro && <div className="card mb-4 border-red-400 text-red-300">{erro}</div>}
      <form action={resendAccess} className="mb-4"><input type="hidden" name="id" value={id} /><input type="hidden" name="back" value={`/admin/personais/${id}`} />
        <button className="btn-ghost">✉ Enviar link de acesso (criar/redefinir senha)</button></form>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[[`${students.length}/${p.max_students}`, "alunos"], [brl(owed), "a repassar"], [brl(total), "gerado no total"]].map(([v, l]) => (
          <div key={l} className="card p-4"><p className="text-2xl font-extrabold text-gold">{v}</p><p className="text-sm text-muted">{l}</p></div>
        ))}
      </div>
      <section className="card mb-6"><h2 className="mb-4 font-bold">Dados e parceria</h2><PersonalForm key={JSON.stringify(p)} p={p} cities={d.cities} action={updatePersonal} /></section>
      {!!students.length && (
        <form action={transferStudents} className="card mb-6 flex flex-wrap items-end gap-2">
          <input type="hidden" name="from" value={id} />
          <div className="flex-1"><label className="label">Transferir TODOS os {students.length} alunos para</label>
            <select name="to" defaultValue="auto" className="input"><option value="auto">⚙ Automático (distribui entre os disponíveis)</option>
              {d.personals.filter((x) => x.active && x.id !== id).map((x) => <option key={x.id} value={x.id}>{x.name} ({d.loadOf(x.id)}/{x.max_students})</option>)}</select></div>
          <button className="btn-ghost">Transferir</button>
        </form>
      )}
      <section className="card">
        <h2 className="mb-3 font-bold">Alunos ({students.length})</h2>
        {!students.length && <p className="text-sm text-muted">Nenhum aluno ainda.</p>}
        {students.map((s) => (
          <a key={s.id} href={`/personal/aluno/${s.id}`} className="flex justify-between border-b border-navy-3 py-2 text-sm last:border-0 hover:text-gold">
            <span>{s.name}{s.is_comp && " 🎁"}</span><span className="text-muted">{getPlan(s.plan)?.name} · {d.cityName(s.city_id)}</span>
          </a>
        ))}
      </section>
    </AdminShell>
  );
}
