import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { createClient, homeFor, requireUser } from "@/lib/supabase/server";

async function setPassword(form: FormData) {
  "use server";
  const pwd = String(form.get("password"));
  if (pwd.length < 8 || pwd !== form.get("confirm")) redirect("/definir-senha?erro=1");
  const supabase = await createClient();
  await supabase.auth.updateUser({ password: pwd });
  const { profile } = await requireUser();
  redirect(homeFor(profile?.role));
}

export default async function DefinirSenha({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const { profile } = await requireUser();
  return (
    <main><Header />
      <form action={setPassword} className="card mx-auto mt-10 max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Bem-vindo(a) à Movva, {profile?.name?.split(" ")[0]}!</h1>
        <p className="text-muted">Crie sua senha de acesso.</p>
        <div><label className="label">Senha (mín. 8 caracteres)</label><input name="password" type="password" minLength={8} required className="input" /></div>
        <div><label className="label">Confirme a senha</label><input name="confirm" type="password" minLength={8} required className="input" /></div>
        {erro && <p className="text-sm text-red-400">As senhas não conferem ou são curtas demais.</p>}
        <button className="btn w-full">Salvar e entrar</button>
      </form>
    </main>
  );
}
