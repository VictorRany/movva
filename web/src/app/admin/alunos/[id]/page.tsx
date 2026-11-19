import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { PLANS, brl, getPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/supabase/server";
import { inMonths } from "@/lib/promo";
import { adminClient } from "@/lib/supabase/server";
import { resendAccess, saveCode, setStudentAccess, updateStudent } from "../../actions";

const STATUS: Record<string, string> = { active: "Ativo", pending: "Aguardando pagamento", inactive: "Sem acesso", cancelled: "Cancelado" };

export default async function AdminAluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  await requireAdmin();
  const d = await loadAdminData();
  const s = d.students.find((x) => x.id === id);
  if (!s) return <AdminShell><p>Aluno não encontrado.</p></AdminShell>;
  const pays = d.payments.filter((p) => p.student_id === id);
  const { data: myCodes } = await adminClient().from("promo_codes").select("*").eq("influencer_id", id);
  const referred = d.students.filter((x) => myCodes?.some((c) => c.code === x.promo_code));
  const back = `/admin/alunos/${id}`;
  const btn = (op: string, label: string, cls = "btn-ghost") => (
    <form action={setStudentAccess}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} /><button className={cls}>{label}</button></form>
  );

  return (
    <AdminShell>
      <Link href="/admin/alunos" className="text-sm text-muted">← Alunos</Link>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{s.name}</h1>
        <span className="rounded-full bg-navy-3 px-3 py-1 text-xs">{STATUS[s.sub_status]}</span>
        {s.is_comp && <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-navy">CORTESIA{s.comp_until ? ` até ${new Date(s.comp_until + "T12:00").toLocaleDateString("pt-BR")}` : ""}</span>}
      </div>
      <p className="mb-4 text-muted">{s.email} · {s.phone ?? "sem telefone"} · cadastro {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
      {ok && <div className="card mb-4 border-gold">✅ {ok}</div>}
      {erro && <div className="card mb-4 border-red-400 text-red-300">{erro}</div>}

      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/personal/aluno/${id}`} className="btn">Ver treino, anamnese e chat</Link>
        <form action={resendAccess}><input type="hidden" name="id" value={id} /><input type="hidden" name="back" value={back} /><button className="btn-ghost">✉ Reenviar acesso (link de senha)</button></form>
        {!s.is_comp && btn("comp_on", "🎁 Tornar cortesia")}
        {s.is_comp && btn("comp_off", "Remover cortesia")}
        {s.sub_status === "active" && !s.is_comp && <span className="self-center text-xs text-muted">Assinante pagante — cancelamento é feito pelo próprio aluno ou no Mercado Pago.</span>}
        {s.sub_status === "active" && s.is_comp && btn("block", "Bloquear acesso", "rounded-xl border border-red-400 px-5 py-3 text-red-400")}
      </div>

      <form key={[s.plan, s.personal_id, s.city_id, s.comp_until, s.comp_note, s.sub_status].join("|")} action={updateStudent} className="card mb-6 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={id} />
        <div><label className="label">Plano</label>
          <select name="plan" defaultValue={s.plan ?? ""} className="input"><option value="">—</option>{PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className="label">Personal</label>
          <select name="personal_id" defaultValue={s.personal_id ?? ""} className="input">
            <option value="">— sem personal —</option><option value="auto">⚙ Automático</option>
            {d.personals.filter((p) => p.active || p.id === s.personal_id).map((p) => <option key={p.id} value={p.id}>{p.name} ({d.loadOf(p.id)}/{p.max_students}) · {d.cityName(p.city_id)}</option>)}
          </select></div>
        <div><label className="label">Cidade</label>
          <select name="city_id" defaultValue={s.city_id ?? ""} className="input"><option value="">— outra / online —</option>{d.cities.map((c) => <option key={c.id} value={c.id}>{c.name}/{c.state}</option>)}</select></div>
        <div><label className="label">Cortesia válida até</label><input name="comp_until" type="date" defaultValue={s.comp_until ?? ""} className="input" /></div>
        <div className="md:col-span-2"><label className="label">Observação</label><input name="comp_note" defaultValue={s.comp_note ?? ""} className="input" /></div>
        <p className="text-xs text-muted md:col-span-2">Trocar o personal avisa o novo personal por e-mail. Pagamentos já registrados continuam com quem atendeu.</p>
        <button className="btn md:col-span-2">Salvar</button>
      </form>

      {s.promo_code && <p className="mb-4 text-sm text-muted">Entrou com o código <b className="text-gold">{s.promo_code}</b>{s.promo_credited ? " (bônus já creditado ao influenciador)" : ""}.</p>}
      {s.is_comp && (
        <section className="card mb-6">
          <h2 className="mb-2 font-bold">🎟 Código promocional</h2>
          {myCodes?.map((c) => (
            <p key={c.code} className="text-sm"><b className="font-mono text-gold">{c.code}</b> · {Number(c.discount_pct)}% off · +{c.bonus_months} mês a cada {c.signups_per_bonus ?? 5} assinaturas · {c.active ? "ativo" : "inativo"}
              <span className="text-muted"> — {referred.length} cadastro(s), {referred.filter((x) => x.promo_credited).length} pagante(s)</span></p>
          ))}
          {!myCodes?.length && (
            <form action={saveCode} className="mt-2 flex flex-wrap gap-2">
              <input type="hidden" name="influencer_id" value={id} /><input type="hidden" name="back" value={`/admin/alunos/${id}`} />
              <input name="code" required placeholder="CÓDIGO" className="input w-40 uppercase" />
              <input name="discount_pct" type="number" min={0} max={90} defaultValue={0} title="Desconto %" className="input w-24" />
              <input name="bonus_months" type="number" min={0} max={12} defaultValue={1} title="Meses grátis" className="input w-24" />
              <input name="signups_per_bonus" type="number" min={1} max={100} defaultValue={5} title="A cada N assinaturas" className="input w-24" />
              <button className="btn-ghost">Criar código</button>
            </form>
          )}
          <p className="mt-2 text-xs text-muted">Sugestão de validade inicial: {new Date(inMonths(3) + "T12:00").toLocaleDateString("pt-BR")} (3 meses).</p>
        </section>
      )}
      <section className="card">
        <h2 className="mb-2 font-bold">Pagamentos</h2>
        {!pays.length && <p className="text-sm text-muted">{s.is_comp ? "Cortesia — sem cobranças." : "Nenhum pagamento."}</p>}
        {pays.map((p) => (
          <p key={p.id} className="text-sm">{new Date(p.paid_at).toLocaleDateString("pt-BR")} · {getPlan(p.plan)?.name} · {brl(Number(p.amount))} · {p.status} · personal: {d.personalName(p.personal_id)}</p>
        ))}
      </section>
    </AdminShell>
  );
}
