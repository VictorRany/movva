import Header from "@/components/Header";
import { brl, getPlan } from "@/lib/plans";
import { requirePersonal } from "@/lib/supabase/server";

export default async function Ganhos() {
  const { supabase, user, profile } = await requirePersonal();
  const [{ data: payments }, { data: payouts }, { data: students }] = await Promise.all([
    supabase.from("payments").select("*").eq("personal_id", user.id).order("paid_at", { ascending: false }),
    supabase.from("payouts").select("*").eq("personal_id", user.id).order("paid_at", { ascending: false }),
    supabase.from("profiles").select("id, name").eq("personal_id", user.id),
  ]);
  const name = (id: string) => students?.find((s) => s.id === id)?.name ?? "Aluno";
  const approved = (payments ?? []).filter((p) => p.status === "approved");
  const pending = approved.filter((p) => !p.payout_id);
  const toReceive = pending.reduce((t, p) => t + Number(p.personal_amount), 0);
  const received = (payouts ?? []).reduce((t, p) => t + Number(p.amount), 0);
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = approved.filter((p) => p.paid_at.slice(0, 7) === month).reduce((t, p) => t + Number(p.personal_amount), 0);

  return (
    <main><Header right={<a href="/personal" className="btn-ghost">← Alunos</a>} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-16">
        <div>
          <h1 className="text-2xl font-bold">Meus ganhos</h1>
          <p className="text-muted">Sua comissão: <b className="text-cream">{Number(profile?.commission_pct ?? 0)}%</b> de cada mensalidade paga pelos seus alunos · Pix: {profile?.pix_key ?? "não cadastrado"}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[[brl(toReceive), "a receber", "text-gold"], [brl(thisMonth), "gerado este mês", ""], [brl(received), "já recebido (total)", ""]].map(([v, l, c]) => (
            <div key={l} className="card"><p className={`text-3xl font-extrabold ${c}`}>{v}</p><p className="text-sm text-muted">{l}</p></div>
          ))}
        </div>

        <section className="card">
          <h2 className="mb-3 font-bold">A receber ({pending.length} mensalidades)</h2>
          {!pending.length && <p className="text-sm text-muted">Nada pendente.</p>}
          <div className="divide-y divide-navy-3 text-sm">
            {pending.map((p) => (
              <div key={p.id} className="flex justify-between py-2">
                <span>{new Date(p.paid_at).toLocaleDateString("pt-BR")} · {name(p.student_id)} · <span className="text-muted">{getPlan(p.plan)?.name} ({brl(Number(p.amount))} × {Number(p.commission_pct)}%)</span></span>
                <b className="text-gold">{brl(Number(p.personal_amount))}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 font-bold">Repasses recebidos</h2>
          {!payouts?.length && <p className="text-sm text-muted">Nenhum repasse ainda.</p>}
          {payouts?.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-navy-3 py-2 text-sm last:border-0">
              <span>{new Date(p.paid_at).toLocaleDateString("pt-BR")} {p.note && <span className="text-muted">· {p.note}</span>}</span><b>{brl(Number(p.amount))}</b>
            </div>
          ))}
        </section>

        {(payments ?? []).some((p) => p.status !== "approved") && (
          <section className="card text-sm">
            <h2 className="mb-2 font-bold">Estornos / cancelados</h2>
            {(payments ?? []).filter((p) => p.status !== "approved").map((p) => (
              <p key={p.id} className="text-muted">{new Date(p.paid_at).toLocaleDateString("pt-BR")} · {name(p.student_id)} · {p.status} · não entra no repasse</p>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
