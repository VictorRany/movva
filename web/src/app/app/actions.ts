"use server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyAnamneseDone, notifyCheckin, notifyMessage } from "@/lib/email";
import { redirect } from "next/navigation";
import { ANAMNESE } from "@/lib/anamnese";
import { IS_DEMO } from "@/lib/demo";
import { adminClient, requireUser } from "@/lib/supabase/server";

export async function markDone(form: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("workout_logs").insert({ student_id: user.id, workout_id: form.get("workout_id"), note: form.get("note") || null });
  revalidatePath("/app");
}

export async function sendCheckin(form: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("checkins").insert({
    student_id: user.id,
    weight: Number(form.get("weight")) || null,
    energy: Number(form.get("energy")) || null,
    feedback: form.get("feedback"),
  });
  after(() => notifyCheckin(user.id));
  revalidatePath("/app/evolucao");
}

export async function saveAnamnese(form: FormData) {
  const { supabase, user } = await requireUser();
  const answers: Record<string, unknown> = {};
  for (const f of ANAMNESE.flatMap((s) => s.fields)) {
    answers[f.key] = f.type === "multi" ? form.getAll(f.key) : String(form.get(f.key) ?? "").trim();
  }
  if (!form.get("terms")) throw new Error("Aceite os termos");
  const { data: before } = await supabase.from("anamneses").select("student_id").eq("student_id", user.id).maybeSingle();
  await supabase.from("anamneses").upsert({ student_id: user.id, answers, updated_at: new Date().toISOString() });
  if (!before) after(() => notifyAnamneseDone(user.id));
  redirect(before ? "/app/perfil" : "/app?bemvindo=1");
}

export async function sendMessage(form: FormData) {
  const { supabase, user } = await requireUser();
  const body = String(form.get("body") ?? "").trim();
  if (body) {
    await supabase.from("messages").insert({ student_id: user.id, from_personal: false, body });
    after(() => notifyMessage(user.id, false, body));
  }
  revalidatePath("/app/mensagens");
}

export async function updateProfile(form: FormData) {
  const { supabase, user } = await requireUser();
  await supabase.from("profiles").update({ name: form.get("name"), phone: form.get("phone") }).eq("id", user.id);
  revalidatePath("/app/perfil");
}

export async function cancelSubscription() {
  const { user, profile } = await requireUser();
  if (!IS_DEMO && profile?.mp_preapproval_id) {
    await new PreApproval(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! }))
      .update({ id: profile.mp_preapproval_id, body: { status: "cancelled" } });
  }
  // mantém o personal_id: se voltar, continua com o mesmo personal
  await adminClient().from("profiles").update({ sub_status: "cancelled" }).eq("id", user.id);
  redirect("/app/planos?cancelado=1");
}
