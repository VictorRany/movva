import StudentShell from "@/components/StudentShell";
import { brl } from "@/lib/plans";
import { requireStudent } from "@/lib/student";
import { logout } from "../../login/actions";
import { cancelSubscription, updateProfile } from "../actions";

export default async function Perfil() {
  const { user, profile, plan, personal } = await requireStudent();
  return (
    <StudentShell nutrition={plan?.nutrition}>
      <h1 className="mb-4 text-2xl font-bold">Perfil</h1>
      <div className="space-y-4">
        <form action={updateProfile} className="card space-y-3">
          <div><label className="label">Nome</label><input name="name" defaultValue={profile?.name ?? ""} required className="input" /></div>
          <div><label className="label">WhatsApp</label><input name="phone" defaultValue={profile?.phone ?? ""} className="input" /></div>
          <p className="text-sm text-muted">E-mail: {user.email}</p>
          <button className="btn">Salvar</button>
        </form>
        <div className="card space-y-2">
          <h2 className="font-bold">Assinatura</h2>
          <p>{plan?.name} · {plan && brl(plan.price)}/mês <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold">ativa</span></p>
          <p className="text-sm text-muted">Cobrança mensal automática pelo Mercado Pago.</p>
          <p className="text-sm">Seu personal: <b>{personal?.name ?? "sendo definido"}</b></p>
          <details className="pt-2 text-sm">
            <summary className="cursor-pointer text-muted">Cancelar assinatura</summary>
            <form action={cancelSubscription} className="mt-3 space-y-2">
              <p>Ao cancelar, você perde o acesso ao treino, dieta e acompanhamento. Tem certeza?</p>
              <button className="rounded-xl border border-red-400 px-4 py-2 text-red-400">Sim, cancelar</button>
            </form>
          </details>
        </div>
        <div className="card flex flex-col gap-2 text-sm">
          <a href="/app/anamnese" className="text-gold">📝 Atualizar minha anamnese</a>
          <a href="/termos" className="text-muted">Termos de uso</a>
          <a href="/privacidade" className="text-muted">Política de privacidade</a>
        </div>
        <form action={logout}><button className="btn-ghost w-full">Sair</button></form>
      </div>
    </StudentShell>
  );
}
