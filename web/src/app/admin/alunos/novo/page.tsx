import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { PLANS } from "@/lib/plans";
import { inMonths } from "@/lib/promo";
import { requireAdmin } from "@/lib/supabase/server";
import { grantComp } from "../../actions";

export default async function NovaCortesia({ searchParams }: { searchParams: Promise<{ erro?: string; tipo?: string }> }) {
  const { erro, tipo } = await searchParams;
  const influ = tipo === "influenciador";
  await requireAdmin();
  const d = await loadAdminData();
  return (
    <AdminShell>
      <Link href={influ ? "/admin/influenciadores" : "/admin/alunos"} className="text-sm text-muted">← {influ ? "Influenciadores" : "Alunos"}</Link>
      <h1 className="mb-1 text-2xl font-bold">{influ ? "Novo influenciador" : "Liberar acesso cortesia"}</h1>
      <p className="mb-4 text-sm text-muted">Para influenciadores e parcerias. A pessoa recebe um e-mail para criar a senha, entra sem pagar, preenche a anamnese e já cai com o personal escolhido. Se o e-mail já tiver conta, a cortesia é aplicada nela.</p>
      {erro && <div className="card mb-4 border-red-400 text-red-300">{erro}</div>}
      <form action={grantComp} className="card grid gap-3 md:grid-cols-2">
        <input type="hidden" name="back" value={influ ? "/admin/alunos/novo?tipo=influenciador" : "/admin/alunos/novo"} />
        <div><label className="label">Nome *</label><input name="name" required className="input" /></div>
        <div><label className="label">E-mail *</label><input name="email" type="email" required className="input" /></div>
        <div><label className="label">WhatsApp</label><input name="phone" className="input" /></div>
        <div><label className="label">Senha inicial</label><input name="password" type="text" minLength={6} placeholder="Deixe vazio para enviar convite por e-mail" className="input" /></div>
        <div><label className="label">Cidade</label>
          <select name="city_id" defaultValue="" className="input"><option value="">— outra / online —</option>{d.cities.map((c) => <option key={c.id} value={c.id}>{c.name}/{c.state}</option>)}</select></div>
        <div><label className="label">Plano liberado *</label>
          <select name="plan" required defaultValue="online-completo" className="input">{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className="label">Personal que vai atender *</label>
          <select name="personal_id" required defaultValue="auto" className="input">
            <option value="auto">⚙ Automático (menos ocupado)</option>
            {d.personals.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} ({d.loadOf(p.id)}/{p.max_students}) · {d.cityName(p.city_id)}</option>)}
          </select></div>
        <div><label className="label">Válido até (vazio = sem prazo)</label><input name="comp_until" type="date" defaultValue={inMonths(3)} className="input" /></div>
        <div><label className="label">{influ ? "Instagram / combinado" : "Observação"}</label><input name="comp_note" placeholder="Ex.: @fulana — 3 stories/mês" className="input" /></div>
        <div className="rounded-xl border border-navy-3 p-4 md:col-span-2">
          <p className="mb-2 font-bold text-gold">🎟 Código promocional {influ ? "*" : "(opcional)"}</p>
          <div className="grid gap-3 md:grid-cols-4">
            <div><label className="label">Código</label><input name="promo_code" required={influ} minLength={3} placeholder="MARIA" className="input uppercase" /></div>
            <div><label className="label">Desconto p/ quem usar (%)</label><input name="discount_pct" type="number" min={0} max={90} defaultValue={0} className="input" /></div>
            <div><label className="label">Ganha (meses grátis)</label><input name="bonus_months" type="number" min={0} max={12} defaultValue={1} className="input" /></div>
            <div><label className="label">A cada (assinaturas pagas)</label><input name="signups_per_bonus" type="number" min={1} max={100} defaultValue={5} className="input" /></div>
          </div>
        </div>
        <button className="btn md:col-span-2">{influ ? "Criar influenciador" : "Liberar acesso"}</button>
      </form>
    </AdminShell>
  );
}
