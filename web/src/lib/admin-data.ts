import { adminClient } from "@/lib/supabase/server";

// Carrega tudo que as telas do admin precisam (chamar só depois de requireAdmin).
export async function loadAdminData() {
  const db = adminClient();
  const [{ data: profiles }, { data: cities }, { data: payments }, { data: payouts }] = await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.from("cities").select("*").order("name"),
    db.from("payments").select("*").order("paid_at", { ascending: false }),
    db.from("payouts").select("*").order("paid_at", { ascending: false }),
  ]);
  const all = profiles ?? [];
  const students = all.filter((p) => p.role === "aluno");
  const personals = all.filter((p) => p.role === "personal");
  const active = students.filter((s) => s.sub_status === "active");
  const approved = (payments ?? []).filter((p) => p.status === "approved");
  const cityName = (id?: string | null) => { const c = cities?.find((c) => c.id === id); return c ? `${c.name}/${c.state}` : "—"; };
  const personalName = (id?: string | null) => personals.find((p) => p.id === id)?.name ?? "—";
  const loadOf = (id: string) => active.filter((s) => s.personal_id === id).length;
  const pendingOf = (id: string) => approved.filter((p) => p.personal_id === id && !p.payout_id);
  return { db, students, personals, active, cities: cities ?? [], payments: payments ?? [], approved, payouts: payouts ?? [], cityName, personalName, loadOf, pendingOf };
}
