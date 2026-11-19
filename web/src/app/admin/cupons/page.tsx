import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { brl } from "@/lib/plans";
import { adminClient, requireAdmin } from "@/lib/supabase/server";
import { saveCode, toggleCode } from "../actions";

export default async function Cupons({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  await requireAdmin();
  const d = await loadAdminData();
  const { data: codes } = await adminClient().from("promo_codes").select("*").order("created_at", { ascending: false });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const stats = (code: string) => {
    const users = d.students.filter((s) => s.promo_code === code);
    const paying = users.filter((s) => s.promo_credited);
    const revenue = d.approved.filter((p) => users.some((u) => u.id === p.student_id)).reduce((t, p) => t + Number(p.amount), 0);
    return { signups: users.length, paying: paying.length, revenue };
  };
  const influencer = (id: string) => d.students.find((s) => s.id === id);

  return (
    <AdminShell>
      <h1 className="mb-1 text-2xl font-bold">Códigos promocionais</h1>
      <p className="mb-4 text-sm text-muted">A cada N assinaturas pagas com o código, o influenciador ganha meses grátis (somados à validade da cortesia dele). Link de divulgação: <b>{site || "seusite"}/c/CODIGO</b></p>
      {ok && <div className="card mb-4 border-gold">{ok}</div>}
      {erro && <div className="card mb-4 border-red-400 text-red-300">{erro}</div>}

      <div className="card mb-6 overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-muted"><tr><th className="p-3">Código</th><th className="p-3">Influenciador</th><th className="p-3">Desconto</th><th className="p-3">Bônus</th><th className="p-3">Usaram</th><th className="p-3">Pagaram</th><th className="p-3">Receita gerada</th><th className="p-3"></th></tr></thead>
          <tbody>
            {(codes ?? []).map((c) => {
              const st = stats(c.code); const inf = influencer(c.influencer_id);
              return (
                <tr key={c.code} className={`border-t border-navy-3 ${!c.active ? "opacity-50" : ""}`}>
                  <td className="p-3 font-mono font-bold text-gold">{c.code}</td>
                  <td className="p-3"><a href={`/admin/alunos/${c.influencer_id}`} className="hover:text-gold">{inf?.name ?? "—"}</a><p className="text-xs text-muted">{inf?.is_comp && inf.comp_until ? `grátis até ${new Date(inf.comp_until + "T12:00").toLocaleDateString("pt-BR")}` : ""}</p></td>
                  <td className="p-3">{Number(c.discount_pct)}%</td><td className="p-3">+{c.bonus_months} mês a cada {c.signups_per_bonus ?? 5}<p className="text-xs text-muted">faltam {(c.signups_per_bonus ?? 5) - (st.paying % (c.signups_per_bonus ?? 5))} p/ o próximo</p></td>
                  <td className="p-3">{st.signups}</td><td className="p-3">{st.paying}</td><td className="p-3">{brl(st.revenue)}</td>
                  <td className="p-3"><form action={toggleCode}><input type="hidden" name="code" value={c.code} /><input type="hidden" name="active" value={String(!c.active)} />
                    <button className="text-xs text-muted underline">{c.active ? "desativar" : "reativar"}</button></form></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!codes?.length && <p className="p-4 text-muted">Nenhum código ainda. Crie ao liberar uma cortesia ou aqui embaixo.</p>}
      </div>

      <form action={saveCode} className="card grid gap-3 md:grid-cols-5">
        <h2 className="font-bold text-gold md:col-span-5">+ Novo código / editar</h2>
        <div><label className="label">Código</label><input name="code" required placeholder="MARIA" className="input uppercase" /></div>
        <div><label className="label">Influenciador</label>
          <select name="influencer_id" required defaultValue="" className="input"><option value="" disabled>Escolha…</option>
            {d.students.filter((s) => s.is_comp).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="label">Desconto (%)</label><input name="discount_pct" type="number" min={0} max={90} defaultValue={0} className="input" /></div>
        <div><label className="label">Ganha (meses)</label><input name="bonus_months" type="number" min={0} max={12} defaultValue={1} className="input" /></div>
        <div><label className="label">A cada (assinaturas)</label><input name="signups_per_bonus" type="number" min={1} max={100} defaultValue={5} className="input" /></div>
        <button className="btn md:col-span-5">Salvar código</button>
      </form>
    </AdminShell>
  );
}
