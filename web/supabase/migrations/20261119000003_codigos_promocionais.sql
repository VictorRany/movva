-- Movva — migração 003: códigos promocionais de influenciadores.
create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9_-]{3,30}$'),
  influencer_id uuid not null references public.profiles on delete cascade,
  discount_pct numeric(5,2) not null default 0 check (discount_pct between 0 and 90), -- desconto para quem usa o código
  bonus_months int not null default 1 check (bonus_months between 0 and 12),        -- meses grátis ganhos pelo influenciador...
  signups_per_bonus int not null default 5 check (signups_per_bonus between 1 and 100), -- ...a cada N assinaturas pagas
  active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists promo_codes_influencer_idx on public.promo_codes (influencer_id);

alter table public.profiles add column if not exists promo_code text references public.promo_codes(code);
alter table public.profiles add column if not exists promo_credited boolean not null default false; -- já gerou o bônus? (evita bônus em dobro)

alter table public.promo_codes enable row level security;
drop policy if exists "promo read" on public.promo_codes;
create policy "promo read" on public.promo_codes for select using (influencer_id = auth.uid() or public.is_admin());
