import crypto from "node:crypto";
import { MercadoPagoConfig, PreApproval } from "mercadopago";
import { assignPersonal, recordPayment } from "@/lib/assign";
import { adminClient } from "@/lib/supabase/server";

const STATUS: Record<string, string> = { authorized: "active", pending: "pending", paused: "inactive", cancelled: "cancelled" };
const token = () => process.env.MP_ACCESS_TOKEN!;

function validSignature(req: Request, dataId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // em produção o segredo é obrigatório
  const parts = Object.fromEntries((req.headers.get("x-signature") ?? "").split(",").map((p) => p.trim().split("=")));
  const manifest = `id:${dataId.toLowerCase()};request-id:${req.headers.get("x-request-id")};ts:${parts.ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return !!parts.v1 && parts.v1.length === hash.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(parts.v1));
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = body.type ?? url.searchParams.get("type");
  const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? "");
  if (!id) return new Response("ignored");
  if (!validSignature(req, id)) return new Response("bad signature", { status: 401 });
  const db = adminClient();

  // 1) mudança no status da assinatura
  if (type === "subscription_preapproval") {
    const sub = await new PreApproval(new MercadoPagoConfig({ accessToken: token() })).get({ id }); // nunca confia no corpo
    const [userId, planId] = String(sub.external_reference ?? "").split("|");
    if (!userId) return new Response("no ref");
    const status = STATUS[sub.status ?? ""] ?? "inactive";
    await db.from("profiles").update({ plan: planId, sub_status: status, mp_preapproval_id: sub.id, ...(status === "active" ? { is_comp: false, comp_until: null } : {}) }).eq("id", userId);
    if (status === "active") await assignPersonal(userId);
    return new Response("ok");
  }

  // 2) cada cobrança mensal da assinatura -> gera o valor a receber do personal
  if (type === "subscription_authorized_payment") {
    const r = await fetch(`https://api.mercadopago.com/authorized_payments/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!r.ok) return new Response("mp error", { status: 502 }); // MP tenta de novo
    const ap = await r.json();
    const { data: student } = await db.from("profiles").select("id").eq("mp_preapproval_id", ap.preapproval_id).maybeSingle();
    if (!student) return new Response("unknown sub", { status: 404 });
    const payStatus = ap.payment?.status ?? ap.status; // approved | refunded | rejected...
    if (payStatus === "approved" || payStatus === "refunded" || payStatus === "charged_back" || payStatus === "cancelled") {
      await recordPayment({
        mpPaymentId: String(ap.payment?.id ?? id), studentId: student.id, amount: Number(ap.transaction_amount),
        status: payStatus, paidAt: ap.date_created,
      });
    }
    return new Response("ok");
  }
  return new Response("ignored");
}
