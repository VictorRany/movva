"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyCheckinReply, notifyMessage, notifyPlanReady } from "@/lib/email";
import { requirePersonal } from "@/lib/supabase/server";

// Formato: uma linha por exercício -> "Supino reto | 4x10 | 60s | https://link-do-video"
function parseExercises(text: string) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name, sets, rest, video] = l.split("|").map((s) => s?.trim());
    return { name, sets, rest, video };
  });
}

export async function saveWorkout(form: FormData) {
  const { supabase } = await requirePersonal();
  const id = form.get("id") as string | null;
  const studentId = String(form.get("student_id"));
  const row = {
    student_id: studentId,
    title: String(form.get("title")),
    notes: (form.get("notes") as string) || null,
    exercises: parseExercises(String(form.get("exercises"))),
    position: Number(form.get("position")) || 0,
  };
  if (id) await supabase.from("workouts").update(row).eq("id", id);
  else {
    // avisa o aluno só no 1º treino de uma leva (personal costuma criar A, B, C em sequência)
    const { data: recent } = await supabase.from("workouts").select("id").eq("student_id", studentId)
      .gte("created_at", new Date(Date.now() - 30 * 60e3).toISOString());
    await supabase.from("workouts").insert(row);
    if (!recent?.length) after(() => notifyPlanReady(studentId, "treino"));
  }
  revalidatePath(`/personal/aluno/${studentId}`);
}

export async function deleteWorkout(form: FormData) {
  const { supabase } = await requirePersonal();
  await supabase.from("workouts").delete().eq("id", form.get("id"));
  revalidatePath(`/personal/aluno/${form.get("student_id")}`);
}

export async function replyCheckin(form: FormData) {
  const { supabase } = await requirePersonal();
  await supabase.from("checkins").update({ reply: form.get("reply") }).eq("id", form.get("id"));
  after(() => notifyCheckinReply(String(form.get("student_id"))));
  revalidatePath(`/personal/aluno/${form.get("student_id")}`);
  revalidatePath("/personal");
}

// Dieta: uma linha por refeição -> "07:00 | Café da manhã | 2 ovos, 1 pão integral"
export async function saveDiet(form: FormData) {
  const { supabase } = await requirePersonal();
  const studentId = String(form.get("student_id"));
  const meals = String(form.get("meals")).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [time, name, items] = l.split("|").map((s) => s?.trim() ?? "");
    return { time, name, items };
  });
  const { data: had } = await supabase.from("diets").select("student_id").eq("student_id", studentId).maybeSingle();
  if (!had) after(() => notifyPlanReady(studentId, "dieta"));
  await supabase.from("diets").upsert({ student_id: studentId, meals, notes: form.get("notes") || null, updated_at: new Date().toISOString() });
  revalidatePath(`/personal/aluno/${studentId}`);
}

export async function sendPersonalMessage(form: FormData) {
  const { supabase } = await requirePersonal();
  const studentId = String(form.get("student_id"));
  const body = String(form.get("body") ?? "").trim();
  if (body) {
    await supabase.from("messages").insert({ student_id: studentId, from_personal: true, body });
    after(() => notifyMessage(studentId, true, body));
  }
  revalidatePath(`/personal/aluno/${studentId}`);
}
