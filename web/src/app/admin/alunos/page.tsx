import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { getPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/supabase/server";
import { reassignStudent } from "../actions";

const STATUS: Record<string, string> = { active: "ativo", pending: "aguardando pagamento", inactive: "sem plano", cancelled: "cancelado" };

export default async function AdminAlunos({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = "ativos", q = "" } = await searchParams;
  await requireAdmin();
  const d = await loadAdminData();
  const filters: [string, string, (s: (typeof d.students)[number]) => boolean][] = [
    ["ativos", "Ativos", (s) => s.sub_status === "active"],
    ["fila", "Sem personal", (s) => s.sub_status === "active" && !s.personal_id],
    ["pendentes", "Aguardando pagamento", (s) => s.sub_status === "pending"],
    ["cancelados", "Cancelados", (s) => s.sub_status === "cancelled"],
    ["leads", "Cadastrados sem plano", (s) => s.sub_status === "inactive"],
  ];
  const fn = filters.find(([k]) => k === f)?.[2] ?? filters[0][2];
  const list = d.students.filter(fn).filter((s) => !q || `${s.name} ${s.email}`.toLowerCase().includes(q.toLowerCase()));
  const activePersonals = d.personals.filter((p) => p.active);

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">Alunos</h1>
      <form className="mb-3"><input type="hidden" name="f" value={f} /><input name="q" defaultValue={q} placeholder="🔍 Nome ou e-mail" className="input" /></form>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {filters.map(([k, l, fx]) => (
          <a key={k} href={`?f=${k}`} className={`rounded-full px-4 py-2 ${f === k ? "bg-gold font-semibold text-navy" : "bg-navy-2"}`}>{l} ({d.students.filter(fx).length})</a>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-muted"><tr><th className="p-3">Aluno</th><th className="p-3">Plano</th><th className="p-3">Cidade</th><th className="p-3">Status</th><th className="p-3">Personal</th></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t border-navy-3 align-top">
                <td className="p-3"><a href={`/personal/aluno/${s.id}`} className="font-semibold hover:text-gold">{s.name}</a><p className="text-xs text-muted">{s.email} · {s.phone}</p></td>
                <td className="p-3">{getPlan(s.plan)?.name ?? "—"}</td>
                <td className="p-3">{d.cityName(s.city_id)}</td>
                <td className="p-3">{STATUS[s.sub_status]}</td>
                <td className="p-3">
                  <form action={reassignStudent} className="flex gap-2">
                    <input type="hidden" name="student_id" value={s.id} />
                    <select name="personal_id" defaultValue={s.personal_id ?? ""} className={`input py-2 ${!s.personal_id && s.sub_status === "active" ? "border-red-400" : ""}`}>
                      <option value="" disabled>— sem personal —</option>
                      <option value="auto">⚙ Automático</option>
                      {activePersonals.map((p) => <option key={p.id} value={p.id}>{p.name} ({d.loadOf(p.id)}/{p.max_students}) · {d.cityName(p.city_id)}</option>)}
                    </select>
                    <button className="btn-ghost px-3 py-2">OK</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-4 text-muted">Ninguém aqui.</p>}
      </div>
    </AdminShell>
  );
}
