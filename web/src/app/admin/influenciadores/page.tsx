import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { brl } from "@/lib/plans";
import { adminClient, requireAdmin } from "@/lib/supabase/server";

export default async function Influenciadores() {
  await requireAdmin();
  const d = await loadAdminData();
  const { data: codes } = await adminClient().from("promo_codes").select("*");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const today = new Date().toISOString().slice(0, 10);
  // influenciador = quem tem código promocional (ou cortesia marcada como influenciador)
  const ids = [...new Set((codes ?? []).map((c) => c.influencer_id))];
  const rows = ids.map((id) => {
    const s = d.students.find((x) => x.id === id);
    const myCodes = (codes ?? []).filter((c) => c.influencer_id === id);
    const used = d.students.filter((x) => myCodes.some((c) => c.code === x.promo_code));
    const paying = used.filter((x) => x.promo_credited).length;
    const every = myCodes[0]?.signups_per_bonus ?? 5;
    const revenue = d.approved.filter((p) => used.some((u) => u.id === p.student_id)).reduce((t, p) => t + Number(p.amount), 0);
    return { id, s, myCodes, used: used.length, paying, every, revenue };
  }).filter((r) => r.s);

  return (
    <AdminShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Influenciadores</h1>
        <div className="flex gap-2">
          <Link href="/admin/cupons" className="btn-ghost">🎟 Códigos</Link>
          <Link href="/admin/alunos/novo?tipo=influenciador" className="btn">+ Novo influenciador</Link>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">Começa com 3 meses grátis. A cada N assinaturas pagas com o código dele, ganha +1 mês automaticamente.</p>
      {!rows.length && <div className="card text-muted">Nenhum influenciador ainda. Clique em “+ Novo influenciador”.</div>}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map(({ id, s, myCodes, used, paying, every, revenue }) => {
          const expired = !!s!.comp_until && s!.comp_until < today;
          return (
            <Link key={id} href={`/admin/alunos/${id}`} className="card block hover:border-gold">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold">{s!.name}</p><p className="text-xs text-muted">{s!.comp_note ?? s!.email}</p></div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${s!.sub_status === "active" && !expired ? "bg-gold text-navy" : "bg-navy-3"}`}>
                  {s!.sub_status === "active" && !expired ? `grátis até ${s!.comp_until ? new Date(s!.comp_until + "T12:00").toLocaleDateString("pt-BR") : "—"}` : "expirado"}
                </span>
              </div>
              <p className="mt-2 font-mono text-gold">{myCodes.map((c) => c.code).join(", ")}</p>
              <p className="truncate text-xs text-muted">{site}/c/{myCodes[0]?.code}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div><p className="font-bold">{used}</p><p className="text-xs text-muted">usaram</p></div>
                <div><p className="font-bold">{paying}</p><p className="text-xs text-muted">pagaram</p></div>
                <div><p className="font-bold">{brl(revenue)}</p><p className="text-xs text-muted">receita</p></div>
              </div>
              <div className="mt-3 h-2 rounded bg-navy"><div className="h-2 rounded bg-gold" style={{ width: `${((paying % every) / every) * 100}%` }} /></div>
              <p className="mt-1 text-xs text-muted">{every - (paying % every)} assinatura(s) para o próximo mês grátis · personal: {d.personalName(s!.personal_id)}</p>
            </Link>
          );
        })}
      </div>
    </AdminShell>
  );
}
