import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IS_DEMO, demoClient } from "@/lib/demo";

type Store = Awaited<ReturnType<typeof cookies>>;
const realClient = (store: Store) =>
  createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
  });

export async function createClient() {
  const store = await cookies();
  if (IS_DEMO) return demoClient(store.get("demo_user")?.value ?? null) as unknown as ReturnType<typeof realClient>;
  return realClient(store);
}

// Só no servidor: ignora RLS. Use SEMPRE depois de checar o papel do usuário.
export function adminClient() {
  if (IS_DEMO) return demoClient("admin") as unknown as ReturnType<typeof realAdmin>;
  return realAdmin();
}
const realAdmin = () =>
  createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return { supabase, user, profile };
}

export const homeFor = (role?: string) => (role === "admin" ? "/admin" : role === "personal" ? "/personal" : "/app");

export async function requirePersonal() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== "personal" && ctx.profile?.role !== "admin") redirect("/app");
  return ctx;
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== "admin") redirect(homeFor(ctx.profile?.role));
  return ctx;
}
