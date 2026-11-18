import StudentShell from "@/components/StudentShell";
import WeightChart from "@/components/WeightChart";
import { requireStudent } from "@/lib/student";
import { sendCheckin } from "../actions";

export default async function Evolucao() {
  const { supabase, user, plan, anamnese } = await requireStudent();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data: checkins }, { count: total }, { count: month }] = await Promise.all([
    supabase.from("checkins").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("student_id", user.id),
    supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("student_id", user.id).gte("done_at", monthStart),
  ]);
  const start = Number(anamnese.answers.weight) || null;
  const pts = [
    ...(start ? [{ date: anamnese.accepted_terms_at, weight: start }] : []),
    ...[...(checkins ?? [])].reverse().filter((c) => c.weight).map((c) => ({ date: c.created_at, weight: Number(c.weight) })),
  ];
  const current = pts.at(-1)?.weight;
  const diff = start && current ? +(current - start).toFixed(1) : null;
  const lastCheckin = checkins?.[0] ? new Date(checkins[0].created_at) : null;
  const canCheckin = !lastCheckin || Date.now() - lastCheckin.getTime() > 5 * 864e5;

  return (
    <StudentShell nutrition={plan?.nutrition}>
      <h1 className="mb-4 text-2xl font-bold">Sua evolução</h1>
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        {[[total ?? 0, "treinos no total"], [month ?? 0, "treinos no mês"], [diff === null ? "—" : `${diff > 0 ? "+" : ""}${diff} kg`, "desde o início"]].map(([v, l]) => (
          <div key={String(l)} className="card p-3"><p className="text-2xl font-extrabold text-gold">{v}</p><p className="text-xs text-muted">{l}</p></div>
        ))}
      </div>
      <div className="card mb-4"><h2 className="mb-2 font-bold">Peso</h2><WeightChart points={pts} /></div>

      {canCheckin ? (
        <form action={sendCheckin} className="card mb-4 space-y-3">
          <h2 className="text-lg font-bold">📋 Check-in semanal</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Peso hoje (kg)</label><input name="weight" type="number" step="0.1" className="input" /></div>
            <div><label className="label">Energia na semana (1–5)</label><input name="energy" type="number" min={1} max={5} className="input" /></div>
          </div>
          <div><label className="label">Como foi a semana? Treinos, dores, dieta, sono…</label><textarea name="feedback" required rows={3} className="input" /></div>
          <button className="btn">Enviar ao personal</button>
        </form>
      ) : <div className="card mb-4 text-sm text-muted">✅ Check-in da semana enviado. O próximo libera em alguns dias.</div>}

      <div className="space-y-3">
        {checkins?.map((c) => (
          <div key={c.id} className="card text-sm">
            <p className="text-muted">{new Date(c.created_at).toLocaleDateString("pt-BR")} {c.weight && `· ${c.weight} kg`} {c.energy && `· energia ${c.energy}/5`}</p>
            <p>{c.feedback}</p>
            {c.reply ? <p className="mt-2 border-l-2 border-gold pl-3"><b>Personal:</b> {c.reply}</p> : <p className="mt-2 text-xs text-muted">Aguardando resposta do personal</p>}
          </div>
        ))}
      </div>
    </StudentShell>
  );
}
