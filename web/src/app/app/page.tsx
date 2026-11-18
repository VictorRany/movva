import StudentShell from "@/components/StudentShell";
import { requireStudent } from "@/lib/student";
import { markDone } from "./actions";

type Exercise = { name: string; sets?: string; rest?: string; video?: string };

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { bemvindo } = await searchParams;
  const { supabase, user, profile, plan } = await requireStudent();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: workouts }, { data: logs }] = await Promise.all([
    supabase.from("workouts").select("*").eq("student_id", user.id).order("position"),
    supabase.from("workout_logs").select("workout_id, done_at").eq("student_id", user.id).gte("done_at", since),
  ]);
  const today = new Date().toDateString();

  return (
    <StudentShell nutrition={plan?.nutrition}>
      <div className="space-y-5">
        {bemvindo && <div className="card border-gold">🎉 Anamnese recebida! Seu personal já foi avisado e vai montar seu treino individual. Você recebe aqui assim que estiver pronto.</div>}
        <div>
          <h1 className="text-2xl font-bold">Bora treinar, {profile?.name?.split(" ")[0]} 💪</h1>
          <p className="text-muted">{plan?.name} · {logs?.length ?? 0} treino(s) nos últimos 7 dias</p>
        </div>

        {!workouts?.length && !bemvindo && <div className="card">⏳ Seu personal está montando seu treino individual. Em breve aparece aqui!</div>}

        {workouts?.map((w) => {
          const doneToday = logs?.some((l) => l.workout_id === w.id && new Date(l.done_at).toDateString() === today);
          return (
            <details key={w.id} className="card" open={workouts.length === 1}>
              <summary className="cursor-pointer text-lg font-bold">{w.title} {doneToday && <span className="text-sm text-gold">✓ feito hoje</span>}</summary>
              {w.notes && <p className="mt-2 rounded-xl bg-navy p-3 text-sm">📝 {w.notes}</p>}
              <ol className="mt-4 space-y-3">
                {(w.exercises as Exercise[]).map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-navy p-3">
                    <div><p className="font-semibold">{i + 1}. {e.name}</p><p className="text-sm text-muted">{[e.sets, e.rest && `descanso ${e.rest}`].filter(Boolean).join(" · ")}</p></div>
                    {e.video && <a href={e.video} target="_blank" className="shrink-0 text-sm text-gold">▶ vídeo</a>}
                  </li>
                ))}
              </ol>
              {!doneToday && (
                <form action={markDone} className="mt-4 flex gap-2">
                  <input type="hidden" name="workout_id" value={w.id} />
                  <input name="note" placeholder="Como foi? Cargas, dificuldades… (opcional)" className="input" />
                  <button className="btn shrink-0">Concluí</button>
                </form>
              )}
            </details>
          );
        })}
      </div>
    </StudentShell>
  );
}
