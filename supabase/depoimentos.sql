-- =====================================================================
-- D'Ivna Confeitaria — depoimentos de clientes (Supabase)
--
-- COMO USAR: no Supabase, abra "SQL Editor" > "New query", cole TODO este
-- arquivo e clique em "Run". Pode rodar de novo sem problema (não apaga nada).
-- Rode DEPOIS do arquivo pedidos.sql (ele cria a função eh_admin usada aqui).
--
-- Como funciona:
--   - Qualquer visitante pode ENVIAR um depoimento, que entra como "pendente".
--   - O público só consegue LER os depoimentos "aprovados".
--   - Só a conta de administradora (a mesma do painel) vê os pendentes,
--     aprova, esconde ou apaga.
-- =====================================================================

create table if not exists public.depoimentos (
  id        uuid        primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome      text        not null default '',
  ocasiao   text        not null default '',
  texto     text        not null,
  nota      smallint,
  status    text        not null default 'pendente',

  constraint depoimentos_nome_tamanho    check (char_length(nome) <= 60),
  constraint depoimentos_ocasiao_tamanho check (char_length(ocasiao) <= 80),
  constraint depoimentos_texto_tamanho   check (char_length(btrim(texto)) between 10 and 600),
  constraint depoimentos_nota_valida     check (nota is null or nota between 1 and 5),
  constraint depoimentos_status_valido   check (status in ('pendente', 'aprovado', 'escondido')),
  -- Sem endereços de internet: barra a maior parte da propaganda e dos golpes.
  constraint depoimentos_sem_links       check (
    (nome || ' ' || ocasiao || ' ' || texto) !~* '(https?://|www\.|\.com\y|\.br\y)'   -- \y = fim de palavra no PostgreSQL
  )
);

-- A nota é obrigatória nos depoimentos novos ("not valid" não mexe nos que já existirem).
alter table public.depoimentos drop constraint if exists depoimentos_nota_obrigatoria;
alter table public.depoimentos
  add constraint depoimentos_nota_obrigatoria check (nota is not null) not valid;

create index if not exists depoimentos_status_criado_idx on public.depoimentos (status, criado_em desc);


-- --------------- Limite de envios (contra enxurrada de spam) ---------------

create or replace function public.depoimentos_limitar_enxurrada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  no_ultimo_minuto integer;
  na_ultima_hora   integer;
begin
  select count(*) filter (where criado_em > now() - interval '1 minute'),
         count(*)
    into no_ultimo_minuto, na_ultima_hora
    from public.depoimentos
   where criado_em > now() - interval '1 hour';

  -- AJUSTE: até 5 por minuto e 30 por hora, somando todos os visitantes.
  if no_ultimo_minuto >= 5 or na_ultima_hora >= 30 then
    raise exception 'Muitos envios em pouco tempo. Tente de novo em alguns minutos.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.depoimentos_limitar_enxurrada() from public, anon, authenticated;

drop trigger if exists depoimentos_limitar_enxurrada on public.depoimentos;
create trigger depoimentos_limitar_enxurrada
  before insert on public.depoimentos
  for each row execute function public.depoimentos_limitar_enxurrada();


-- --------------------------- Permissões e regras ---------------------------

alter table public.depoimentos enable row level security;
revoke all on public.depoimentos from anon, authenticated;

-- Visitante: só pode enviar (nunca escolhe o status, que nasce "pendente") ...
grant insert (id, nome, ocasiao, texto, nota) on public.depoimentos to anon, authenticated;
-- ... e ler os campos públicos (as regras abaixo limitam às linhas aprovadas).
grant select (id, criado_em, nome, ocasiao, texto, nota) on public.depoimentos to anon;
-- Conta logada: lê tudo (as regras limitam à administradora), muda o status e apaga.
grant select on public.depoimentos to authenticated;
grant update (status) on public.depoimentos to authenticated;
grant delete on public.depoimentos to authenticated;

drop policy if exists "site envia depoimento" on public.depoimentos;
create policy "site envia depoimento"
  on public.depoimentos for insert
  to anon, authenticated
  with check (status = 'pendente');

drop policy if exists "publico ve aprovados" on public.depoimentos;
create policy "publico ve aprovados"
  on public.depoimentos for select
  to anon, authenticated
  using (status = 'aprovado');

drop policy if exists "admin ve todos" on public.depoimentos;
create policy "admin ve todos"
  on public.depoimentos for select
  to authenticated
  using ((select public.eh_admin()));

drop policy if exists "admin muda status" on public.depoimentos;
create policy "admin muda status"
  on public.depoimentos for update
  to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));

drop policy if exists "admin apaga" on public.depoimentos;
create policy "admin apaga"
  on public.depoimentos for delete
  to authenticated
  using ((select public.eh_admin()));
