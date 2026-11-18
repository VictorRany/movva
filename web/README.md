# Movva — SaaS de personal trainer

Next.js 15 + Supabase + Mercado Pago (assinatura recorrente). Papéis: **aluno**, **personal**, **admin**.

Sem Supabase configurado, o app roda em **modo demonstração** (dados de exemplo em memória; botões de login rápido em `/login`).

## Colocar no ar
1. **Supabase** (supabase.com): crie um projeto e rode `supabase/schema.sql` no SQL Editor.
   - Authentication → URL Configuration: *Site URL* = seu domínio.
   - Authentication → Emails → **Invite user**: troque o link por
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/definir-senha`
   - Configure um SMTP próprio (Resend, SendGrid…) — o e-mail padrão do Supabase tem limite baixo.
2. **Mercado Pago** → Suas integrações → Webhooks: URL `https://SEU_DOMINIO/api/mp/webhook`,
   eventos **Planos e assinaturas** (`subscription_preapproval`) e **Pagamentos de assinaturas** (`subscription_authorized_payment`).
   Copie a assinatura secreta para `MP_WEBHOOK_SECRET` (obrigatória em produção).
3. Copie `.env.example` para `.env.local` e preencha. Deploy na Vercel com as mesmas variáveis.
4. Crie sua conta pelo site e vire admin:
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'SEU_EMAIL');`
5. No painel `/admin`: cadastre cidades → ative → cadastre personais (eles recebem convite por e-mail).

## Como o dinheiro flui
- Cada cobrança aprovada gera uma linha em `payments` com a comissão **congelada** (% do personal naquele momento).
- `mp_payment_id` é único: webhooks repetidos não duplicam nada. Estornos mudam o status e saem do repasse.
- Admin → Financeiro → “Registrar repasse” agrupa as mensalidades pendentes em um `payout`.

## Atribuição de personal
Automática ao ativar a assinatura: presencial → personal presencial da cidade do aluno; online → qualquer personal online
(prefere a mesma cidade), sempre o menos ocupado e abaixo do limite. Sem vaga → fila “Sem personal” no admin.

## Onde mexer
- Planos e preços: `src/lib/plans.ts` (não mude o `id` de um plano com assinantes)
- Perguntas da anamnese: `src/lib/anamnese.ts`
- Contrato de parceria: `../contratos/Contrato_Parceria_Personal_Movva.docx`
