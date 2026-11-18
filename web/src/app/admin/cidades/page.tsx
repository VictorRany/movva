import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/supabase/server";
import { addCity, toggleCity } from "../actions";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export default async function AdminCidades({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  await requireAdmin();
  const d = await loadAdminData();
  const leads = d.students.filter((s) => s.sub_status !== "active");
  return (
    <AdminShell>
      <h1 className="mb-1 text-2xl font-bold">Cidades</h1>
      <p className="mb-4 text-sm text-muted">Cidades <b>ativas</b> aparecem no cadastro e liberam o plano presencial (se houver personal presencial com vaga). Planos online valem para todo o Brasil.</p>
      {erro && <div className="card mb-4 border-red-400 text-red-300">{erro}</div>}
      <form action={addCity} className="card mb-6 flex flex-wrap gap-2">
        <input name="name" required placeholder="Nome da cidade" className="input flex-1" />
        <select name="state" required defaultValue="" className="input w-28"><option value="" disabled>UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select>
        <button className="btn">Adicionar</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="text-left text-muted"><tr><th className="p-3">Cidade</th><th className="p-3">Personais presenciais</th><th className="p-3">Alunos ativos</th><th className="p-3">Interessados</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {d.cities.map((c) => {
              const pres = d.personals.filter((p) => p.active && p.accepts_presencial && p.city_id === c.id).length;
              return (
                <tr key={c.id} className="border-t border-navy-3">
                  <td className="p-3 font-semibold">{c.name}/{c.state}</td>
                  <td className={`p-3 ${c.active && !pres ? "text-red-300" : ""}`}>{pres}{c.active && !pres && " ⚠ sem personal"}</td>
                  <td className="p-3">{d.active.filter((s) => s.city_id === c.id).length}</td>
                  <td className="p-3">{leads.filter((s) => s.city_id === c.id).length}</td>
                  <td className="p-3">
                    <form action={toggleCity}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="active" value={String(!c.active)} />
                      <button className={`rounded-full px-3 py-1 text-xs font-bold ${c.active ? "bg-gold text-navy" : "bg-navy-3"}`}>{c.active ? "ATIVA" : "INATIVA"} — {c.active ? "desativar" : "ativar"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
