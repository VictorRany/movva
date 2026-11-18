import { redirect } from "next/navigation";
import { getPlan } from "@/lib/plans";
import { homeFor, requireUser } from "@/lib/supabase/server";

// Garante: aluno logado, assinatura ativa e anamnese preenchida.
export async function requireStudent() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== "aluno") redirect(homeFor(ctx.profile?.role));
  if (ctx.profile?.sub_status !== "active") redirect("/app/planos");
  const { data: anamnese } = await ctx.supabase.from("anamneses").select("*").eq("student_id", ctx.user.id).single();
  if (!anamnese) redirect("/app/anamnese");
  const { data: personal } = ctx.profile?.personal_id
    ? await ctx.supabase.from("profiles").select("id, name, phone").eq("id", ctx.profile.personal_id).single()
    : { data: null };
  return { ...ctx, anamnese, personal, plan: getPlan(ctx.profile?.plan) };
}
