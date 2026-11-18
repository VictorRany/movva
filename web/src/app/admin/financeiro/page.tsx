import AdminShell from "@/components/AdminShell";
import { loadAdminData } from "@/lib/admin-data";
import { brl, getPlan } from "@/lib/plans";
import { requireAdmin } from "@/lib/supabase/server";
import { registerPayout } from "../actions";

export default async function Financeiro({ searchParams }: { searchParams: Promise<{ m?: string; erro?: string }> }) {
  const { m = new Date().toISOString().slice(0, 7), erro } = await searchParams;
  await requireAdmin();
  const d = await loadAdminData();
  const studentName = (id: string) => d.students.find((s) => s.id === id)?.name ?? "—";
  const monthPays = d.payments.filter((p) => p.paid_at.slice(0, 7) === m);
  const ok = monthPays.filter((p) => p.status === "approved");
  const gross = ok.reduce((t, p) => t + Number(p.amount), 0);
  const comm = ok.reduce((t, p) => t + Number(p.personal_amount ?? 0), 0);
  const months = [...new Set([new Date().toISOString().slice(0, 7), ...d.payments.map((p) => p.paid_at.slice(0, 7))])].sort().reverse();
  const toPay = d.personals.map((p) => ({ p, items: d.pendingOf(p.id) })).filter((x) => x.items.length);

  return (
    <AdminShell>
      <h1 className="mb-4 text-2xl font-bold">Financeiro</h1>
      {erro && <div className="card mb-4 border-red-400 text-red-300">{erro}</div>}

      <h2 className="mb-3 text-lg font-bold">Repasses pendentes</h2>
      <p className="mb-3 text-sm text-muted">Faça o Pix para o personal e clique em “Registrar repasse”. Só mensalidades aprovadas entram; estornos ficam de fora automaticamente.</p>
      <div className="mb-8 space-y-3">
        {!toPay.length && <p className="text-muted">Nenhum repasse pendente ✅</p>}
        {toPay.map(({ p, items }) => {
          const total = items.reduce((t, x) => t + Number(x.personal_amount), 0);
          return (
            <details key={p.id} className="card">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span><b>{p.name}</b> <span className="text-sm text-muted">· {items.length} mensalidade(s) · Pix: {p.pix_key ?? "—"}</span></span>
                <b className="text-xl text-gold">{brl(total)}</b>
              </summary>
              <div className="mt-3 divide-y divide-navy-3 text-sm">
                {items.map((x) => (
                  <div key={x.id} className="flex justify-between py-1"><span>{new Date(x.paid_at).toLocaleDateString("pt-BR")} · {studentName(x.student_id)} · {brl(Number(x.amount))} × {Number(x.commission_pct)}%</span><span>{brl(Number(x.personal_amount))}</span></div>
                ))}
              </div>
              <form action={registerPayout} className="mt-3 flex gap-2">
                <input type="hidden" name="personal_id" value={p.id} />
                <input type="hidden" name="payment_ids" value={items.map((x) => x.id).join(",")} />
                <input name="note" placeholder="Observação (ex.: Pix 05/12)" className="input" />
                <button className="btn shrink-0">Registrar repasse de {brl(total)}</button>
              </form>
            </details>
          );
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Mensalidades</h2>
        <form className="flex gap-2"><select name="m" defaultValue={m} className="input py-2">{months.map((x) => <option key={x}>{x}</option>)}</select><button className="btn-ghost py-2">Ver</button></form>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[[brl(gross), "bruto"], [brl(comm), "comissões"], [brl(gross - comm), "Movva (antes de taxas MP)"]].map(([v, l]) => (
          <div key={l} className="card p-4"><p className="text-xl font-extrabold text-gold">{v}</p><p className="text-sm text-muted">{l}</p></div>
        ))}
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="text-left text-muted"><tr><th className="p-3">Data</th><th className="p-3">Aluno</th><th className="p-3">Plano</th><th className="p-3">Valor</th><th className="p-3">Personal</th><th className="p-3">Comissão</th><th className="p-3">Status</th></tr></thead>
          <tbody>
            {monthPays.map((x) => (
              <tr key={x.id} className="border-t border-navy-3">
                <td className="p-3">{new Date(x.paid_at).toLocaleDateString("pt-BR")}</td><td className="p-3">{studentName(x.student_id)}</td>
                <td className="p-3">{getPlan(x.plan)?.name ?? x.plan}</td><td className="p-3">{brl(Number(x.amount))}</td>
                <td className="p-3">{d.personalName(x.personal_id)}</td><td className="p-3">{brl(Number(x.personal_amount ?? 0))}</td>
                <td className="p-3">{x.status !== "approved" ? <span className="text-red-300">{x.status}</span> : x.payout_id ? "repassado" : <span className="text-gold">a repassar</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!monthPays.length && <p className="p-4 text-muted">Sem mensalidades neste mês.</p>}
      </div>
    </AdminShell>
  );
}
