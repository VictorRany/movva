import { redirect } from "next/navigation";
import Header from "@/components/Header";
import PlanCards from "@/components/PlanCards";
import { eligiblePersonals } from "@/lib/assign";
import { homeFor, requireUser } from "@/lib/supabase/server";
import { logout } from "../../login/actions";

export default async function Planos({ searchParams }: { searchParams: Promise<{ pago?: string; cancelado?: string; indisponivel?: string }> }) {
  const { pago, cancelado, indisponivel } = await searchParams;
  const { profile } = await requireUser();
  if (profile?.role !== "aluno") redirect(homeFor(profile?.role));
  const presencialOk = (await eligiblePersonals("presencial-sp", profile?.city_id ?? null)).length > 0;
  if (profile?.sub_status === "active") redirect("/app");
  const waiting = pago || profile?.sub_status === "pending";
  return (
    <main>
      <Header right={<form action={logout}><button className="btn-ghost">Sair</button></form>} />
      <div className="mx-auto max-w-5xl px-4 pb-16">
        {waiting && <div className="card mb-6 border-gold">✅ Recebemos sua assinatura! Assim que o Mercado Pago confirmar o pagamento seu acesso é liberado. <a href="/app" className="text-gold underline">Atualizar</a></div>}
        {indisponivel && <div className="card mb-6">No momento não há personal presencial disponível na sua cidade. Escolha um plano online!</div>}
        {cancelado && <div className="card mb-6">Sua assinatura foi cancelada. Sentiremos sua falta! Você pode voltar quando quiser.</div>}
        <h1 className="mb-2 text-2xl font-bold">Olá, {profile?.name?.split(" ")[0]}! Escolha seu plano</h1>
        <p className="mb-6 text-muted">Depois do pagamento você responde um questionário rápido e seu personal monta seu treino individual.</p>
        <PlanCards loggedIn presencialOk={presencialOk} />
      </div>
    </main>
  );
}
