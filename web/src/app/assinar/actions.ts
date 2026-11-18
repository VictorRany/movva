"use server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { redirect } from "next/navigation";
import { assignPersonal, eligiblePersonals, recordPayment } from "@/lib/assign";
import { IS_DEMO } from "@/lib/demo";
import { getPlan } from "@/lib/plans";
import { adminClient, requireUser } from "@/lib/supabase/server";

export async function subscribe(form: FormData) {
  const plan = getPlan(String(form.get("plan")));
  if (!plan) throw new Error("Plano inválido");
  const { user, profile } = await requireUser();
  if (profile?.sub_status === "active") redirect("/app");

  // Presencial só se houver personal disponível na cidade do aluno
  if (plan.modality === "presencial" && !(await eligiblePersonals(plan.id, profile?.city_id)).length) {
    redirect("/app/planos?indisponivel=1");
  }

  if (IS_DEMO) {
    // simula: assinatura aprovada + primeira cobrança
    await adminClient().from("profiles").update({ plan: plan.id, sub_status: "active", mp_preapproval_id: `pre-${user.id}` }).eq("id", user.id);
    await assignPersonal(user.id);
    await recordPayment({ mpPaymentId: `demo-${user.id}-${Date.now()}`, studentId: user.id, amount: plan.price, status: "approved" });
    redirect("/app");
  }

  const sub = await new PreApproval(new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })).create({
    body: {
      reason: `Movva - ${plan.name}`,
      external_reference: `${user.id}|${plan.id}`,
      payer_email: user.email!,
      back_url: `${process.env.NEXT_PUBLIC_SITE_URL}/app/planos?pago=1`,
      status: "pending",
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: plan.price, currency_id: "BRL" },
    },
  });
  redirect(sub.init_point!);
}
