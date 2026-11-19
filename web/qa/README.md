# QA ponta a ponta (produção)

Cria admin, 2 personais e 1 aluna de teste, percorre a jornada completa (celular, tablet, desktop),
testa as regras de segurança do banco e **apaga tudo no final**.

```bash
cd web/qa && npm i playwright@1.55.0 @supabase/supabase-js@2.58.0 && npx playwright install chromium
SB_URL=https://<ref>.supabase.co SB_ANON=<anon> SB_SR=<service_role> node qa.mjs
```
Capturas de tela ficam em `qa/shots/`.
