import { redirect } from "next/navigation";
import StudentShell from "@/components/StudentShell";
import { requireStudent } from "@/lib/student";

type Meal = { time: string; name: string; items: string };

export default async function Dieta() {
  const { supabase, user, plan } = await requireStudent();
  if (!plan?.nutrition) redirect("/app");
  const { data: diet } = await supabase.from("diets").select("*").eq("student_id", user.id).single();
  return (
    <StudentShell nutrition>
      <h1 className="mb-4 text-2xl font-bold">Seu plano alimentar</h1>
      {!diet ? <div className="card">Seu plano alimentar está sendo preparado.</div> : (
        <div className="space-y-3">
          {diet.notes && <div className="card border-gold text-sm">{diet.notes}</div>}
          {(diet.meals as Meal[]).map((m, i) => (
            <div key={i} className="card flex gap-4">
              <p className="num w-14 shrink-0 text-xl font-bold text-gold">{m.time}</p>
              <div><p className="font-semibold">{m.name}</p><p className="text-sm text-muted">{m.items}</p></div>
            </div>
          ))}
          <p className="text-center text-xs text-muted">Atualizado em {new Date(diet.updated_at).toLocaleDateString("pt-BR")}</p>
        </div>
      )}
    </StudentShell>
  );
}
