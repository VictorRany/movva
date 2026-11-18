"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IS_DEMO } from "@/lib/demo";
import { createClient, homeFor } from "@/lib/supabase/server";

export async function auth(_: string | null, form: FormData) {
  const supabase = await createClient();
  const email = String(form.get("email")).trim().toLowerCase();
  const password = String(form.get("password"));
  const plan = String(form.get("plan") ?? "");

  if (form.get("mode") === "signup") {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name: String(form.get("name")).trim(), phone: form.get("phone"), city_id: form.get("city_id") || "" } },
    });
    if (error) return error.message.includes("registered") ? "Este e-mail já tem conta. Faça login." : error.message;
    redirect(plan ? `/app/planos?plano=${plan}` : "/app");
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return "E-mail ou senha inválidos";
  const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  redirect(homeFor(p?.role));
}

export async function demoLogin(form: FormData) {
  const as = String(form.get("as"));
  (await cookies()).set("demo_user", as);
  redirect(homeFor(as.split("-")[0]));
}

export async function logout() {
  if (IS_DEMO) (await cookies()).delete("demo_user");
  else await (await createClient()).auth.signOut();
  redirect("/");
}
