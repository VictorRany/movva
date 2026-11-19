"use client";
import { useActionState, useState } from "react";
import { auth, demoLogin } from "./actions";

type City = { id: string; name: string; state: string };

export default function LoginForm({ plan, next, cities, demo }: { plan?: string; next?: string; cities: City[]; demo: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">(plan ? "signup" : "login");
  const [error, action, pending] = useActionState(auth, null);
  return (
    <>
      <form action={action} className="card mx-auto mt-10 max-w-md space-y-4">
        <h1 className="text-2xl font-bold">{mode === "signup" ? "Criar conta" : "Entrar"}</h1>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="plan" value={plan ?? ""} />
        <input type="hidden" name="next" value={next ?? ""} />
        {mode === "signup" && (<>
          <div><label className="label">Nome completo</label><input name="name" required minLength={3} className="input" /></div>
          <div><label className="label">WhatsApp</label><input name="phone" required className="input" placeholder="(11) 99999-9999" /></div>
          <div><label className="label">Sua cidade</label>
            <select name="city_id" defaultValue="" className="input">
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name} / {c.state}</option>)}
              <option value="">Outra cidade (somente planos online)</option>
            </select></div>
        </>)}
        <div><label className="label">E-mail</label><input name="email" type="email" required className="input" /></div>
        <div><label className="label">Senha</label><input name="password" type="password" minLength={6} required className="input" /></div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={pending} className="btn w-full">{pending ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}</button>
        <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="w-full text-sm text-muted">
          {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tenho conta"}
        </button>
      </form>
      {demo && (
        <form action={demoLogin} className="card mx-auto my-4 max-w-md space-y-2 border-gold">
          <p className="text-sm font-semibold text-gold">MODO DEMONSTRAÇÃO — entrar como:</p>
          <button name="as" value="admin-1" className="btn w-full">👑 Admin (você)</button>
          <button name="as" value="personal-1" className="btn-ghost w-full">Personal Lucas (SP)</button>
          <button name="as" value="personal-2" className="btn-ghost w-full">Personal Marina (SP, só online)</button>
          <button name="as" value="aluno-1" className="btn-ghost w-full">Aluna Ana (com treino e dieta)</button>
          <button name="as" value="aluno-4" className="btn-ghost w-full">Aluna Duda (nova: plano → anamnese)</button>
          <button name="as" value="aluno-2" className="btn-ghost w-full">Aluno Bruno (pagou, falta anamnese)</button>
        </form>
      )}
    </>
  );
}
