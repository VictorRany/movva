-- =====================================================================
-- MOVVA — schema completo. Rode no SQL Editor do Supabase (projeto novo).
-- Papéis: aluno | personal | admin
-- Escritas sensíveis (status de assinatura, papel, comissão, pagamentos,
-- atribuição de personal) são feitas SOMENTE pelo servidor com a service role.
-- =====================================================================

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state char(2) not null,
  active boolean not null default false,
  created_at timestamptz default now(),
  unique (name, state)
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  phone text,
  role text not null default 'aluno' check (role in ('aluno','personal','admin')),
  city_id uuid references public.cities,
  -- aluno
  plan text,
  sub_status text not null default 'inactive' check (sub_status in ('inactive','pending','active','cancelled')),
  mp_preapproval_id text unique,
  personal_id uuid references public.profiles,
  assigned_at timestamptz,
  -- personal
  cpf text,
  cref text,
  pix_key text,
  commission_pct numeric(5,2) check (commission_pct between 0 and 100),
  max_students int default 50,
  accepts_online boolean default true,
  accepts_presencial boolean default true,
  active boolean default true,
  contract_signed_at date,
  created_at timestamptz default now()
);
create index on public.profiles (personal_id);
create index on public.profiles (role, city_id);

create table public.anamneses (
  student_id uuid primary key references public.profiles on delete cascade,
  answers jsonb not null,
  accepted_terms_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  title text not null,
  notes text,
  exercises jsonb not null default '[]',
  position int default 0,
  created_at timestamptz default now()
);
create index on public.workouts (student_id);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  workout_id uuid not null references public.workouts on delete cascade,
  note text,
  done_at timestamptz default now()
);
create index on public.workout_logs (student_id, done_at);

create table public.diets (
  student_id uuid primary key references public.profiles on delete cascade,
  meals jsonb not null default '[]',
  notes text,
  updated_at timestamptz default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  weight numeric,
  energy int,
  feedback text,
  reply text,
  created_at timestamptz default now()
);
create index on public.checkins (student_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  from_personal boolean not null default false,
  body text not null,
  read boolean not null default false,
  created_at timestamptz default now()
);
create index on public.messages (student_id, created_at);

-- Repasses ao personal (criado quando o admin marca como pago)
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.profiles,
  amount numeric(10,2) not null,
  note text,
  paid_at timestamptz default now()
);

-- Cada cobrança aprovada do Mercado Pago. mp_payment_id único = sem duplicidade.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  mp_payment_id text not null unique,
  student_id uuid not null references public.profiles,
  personal_id uuid references public.profiles,
  plan text,
  amount numeric(10,2) not null,
  commission_pct numeric(5,2),          -- congelado no momento do pagamento
  personal_amount numeric(10,2),        -- valor do personal neste pagamento
  status text not null,                 -- approved | refunded | cancelled | ...
  paid_at timestamptz default now(),
  payout_id uuid references public.payouts
);
create index on public.payments (personal_id, payout_id);

-- ===== perfil automático no cadastro =====
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, phone, city_id)
  values (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'phone',
          nullif(new.raw_user_meta_data->>'city_id','')::uuid);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== helpers de permissão =====
create function public.my_role() returns text language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(my_role() = 'admin', false) $$;
create function public.my_personal_id() returns uuid language sql stable security definer set search_path = public as
$$ select personal_id from profiles where id = auth.uid() $$;
-- personal (ou admin) pode gerenciar este aluno?
create function public.can_manage(sid uuid) returns boolean language sql stable security definer set search_path = public as
$$ select is_admin() or exists (select 1 from profiles where id = sid and personal_id = auth.uid()) $$;

-- ===== RLS =====
alter table cities enable row level security;
alter table profiles enable row level security;
alter table anamneses enable row level security;
alter table workouts enable row level security;
alter table workout_logs enable row level security;
alter table diets enable row level security;
alter table checkins enable row level security;
alter table messages enable row level security;
alter table payouts enable row level security;
alter table payments enable row level security;

create policy "cities public read" on cities for select using (true);

create policy "profiles read" on profiles for select using (
  id = auth.uid() or is_admin() or personal_id = auth.uid() or id = my_personal_id());
-- usuário só altera nome e telefone; o resto é via servidor
revoke update on profiles from authenticated, anon;
grant update (name, phone) on profiles to authenticated;
create policy "profiles self update" on profiles for update using (id = auth.uid());

create policy "anamnese read" on anamneses for select using (student_id = auth.uid() or can_manage(student_id));
create policy "anamnese insert" on anamneses for insert with check (student_id = auth.uid());
create policy "anamnese update" on anamneses for update using (student_id = auth.uid());

create policy "workouts read" on workouts for select using (student_id = auth.uid() or can_manage(student_id));
create policy "workouts manage" on workouts for all using (can_manage(student_id)) with check (can_manage(student_id));

create policy "logs read" on workout_logs for select using (student_id = auth.uid() or can_manage(student_id));
create policy "logs insert" on workout_logs for insert with check (student_id = auth.uid());

create policy "diet read" on diets for select using (student_id = auth.uid() or can_manage(student_id));
create policy "diet manage" on diets for all using (can_manage(student_id)) with check (can_manage(student_id));

create policy "checkins read" on checkins for select using (student_id = auth.uid() or can_manage(student_id));
create policy "checkins insert" on checkins for insert with check (student_id = auth.uid());
create policy "checkins reply" on checkins for update using (can_manage(student_id));

create policy "msg read" on messages for select using (student_id = auth.uid() or can_manage(student_id));
create policy "msg student" on messages for insert with check (student_id = auth.uid() and from_personal = false);
create policy "msg personal" on messages for insert with check (can_manage(student_id) and from_personal = true);
create policy "msg read flag" on messages for update using (student_id = auth.uid() or can_manage(student_id));

create policy "payments read" on payments for select using (personal_id = auth.uid() or is_admin());
create policy "payouts read" on payouts for select using (personal_id = auth.uid() or is_admin());

-- ===== primeiro admin =====
-- 1) crie sua conta pelo site  2) rode:
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'SEU_EMAIL');
