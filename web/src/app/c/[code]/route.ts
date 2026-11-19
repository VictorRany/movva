import { NextResponse } from "next/server";
import { findCode, normalizeCode } from "@/lib/promo";

// Link de divulgação: movva.com.br/c/MARIA -> guarda o código por 30 dias e abre os planos
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const ok = await findCode(code);
  const res = NextResponse.redirect(new URL(ok ? `/?cupom=${code}#planos` : "/#planos", req.url));
  if (ok) res.cookies.set("promo", code, { maxAge: 30 * 864e2, path: "/", sameSite: "lax" });
  return res;
}
