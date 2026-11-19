-- Movva — migração 002: acessos cortesia (influenciadores) e avisos por e-mail.
-- Rode DEPOIS do schema.sql. Pode rodar mais de uma vez sem erro.

alter table public.profiles add column if not exists is_comp boolean not null default false; -- acesso cortesia (sem cobrança)
alter table public.profiles add column if not exists comp_until date;                       -- validade da cortesia (vazio = sem prazo)
alter table public.profiles add column if not exists comp_note text;                        -- ex.: "Influenciadora @fulana — parceria nov/26"
alter table public.profiles add column if not exists email_notifications boolean not null default true;

-- Mantém o e-mail do perfil igual ao do login (se o usuário trocar o e-mail)
create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end; $$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- aluno/personal podem ligar/desligar os próprios avisos por e-mail
grant update (email_notifications) on public.profiles to authenticated;

create index if not exists profiles_is_comp_idx on public.profiles (is_comp) where is_comp;
