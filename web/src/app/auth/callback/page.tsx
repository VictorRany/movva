"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

// Recebe o link dos e-mails padrão do Supabase (convite / recuperação de senha).
// O login chega no "#access_token=..." (só o navegador lê) ou em "?code=...".
export default function AuthCallback() {
  const [msg, setMsg] = useState("Entrando…");
  useEffect(() => {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const url = new URL(window.location.href);
    const next = url.searchParams.get("next") ?? "/definir-senha";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const go = (ok: boolean) => (ok ? window.location.replace(safeNext) : setMsg("Este link expirou ou já foi usado. Peça um novo link de acesso."));
    (async () => {
      if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! });
        return go(!error);
      }
      const code = url.searchParams.get("code");
      if (code) return go(!(await supabase.auth.exchangeCodeForSession(code)).error);
      go(false);
    })();
  }, []);
  return <main className="grid min-h-dvh place-items-center p-6 text-center"><p className="text-lg">{msg}</p></main>;
}
