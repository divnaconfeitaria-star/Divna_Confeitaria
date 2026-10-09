-- =====================================================================
-- D'Ivna Confeitaria — banco de pedidos (Supabase)
--
-- COMO USAR: no Supabase, abra "SQL Editor" > "New query", cole TODO este
-- arquivo e clique em "Run". Pode rodar de novo sem problema (não apaga pedidos).
--
-- O que este arquivo cria:
--   pedidos   cada pedido finalizado no site (itens, total, nome, status)
--   admins    quem pode ver o painel (só a conta da confeiteira)
--
-- Segurança:
--   - Visitantes do site SÓ conseguem CRIAR pedido novo. Não conseguem ler,
--     alterar nem apagar nada, e não escolhem data nem status.
--   - Só quem está na tabela "admins" vê os pedidos e muda o status.
-- =====================================================================


-- ----------------------------- TABELA PEDIDOS -----------------------------

-- Confere se a lista de itens tem o formato certo:
-- [{ "nome": "Coxinha", "qtd": 30, "preco_centavos": 200 }, ...]
create or replace function public.pedido_itens_validos(itens jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(itens) = 'array'
     and jsonb_array_length(itens) between 1 and 200
     and not exists (
       select 1
       from jsonb_array_elements(itens) as i(item)
       where jsonb_typeof(i.item) <> 'object'
          or jsonb_typeof(i.item -> 'nome') <> 'string'
          or char_length(i.item ->> 'nome') not between 1 and 150
          or jsonb_typeof(i.item -> 'qtd') <> 'number'
          or jsonb_typeof(i.item -> 'preco_centavos') <> 'number'
          or (i.item ->> 'qtd') !~ '^[0-9]{1,4}$'
          or (i.item ->> 'qtd')::int not between 1 and 9999
          or (i.item ->> 'preco_centavos') !~ '^[0-9]{1,7}$'
     );
$$;

-- Soma qtd × preço de todos os itens (em centavos).
create or replace function public.pedido_itens_total(itens jsonb)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select coalesce(sum((i.item ->> 'qtd')::bigint * (i.item ->> 'preco_centavos')::bigint), 0)
  from jsonb_array_elements(itens) as i(item);
$$;

create table if not exists public.pedidos (
  id              uuid        primary key default gen_random_uuid(),
  codigo          text        not null,
  criado_em       timestamptz not null default now(),
  cliente_nome    text        not null,
  observacoes     text        not null default '',
  itens           jsonb       not null,
  total_centavos  integer     not null,
  status          text        not null default 'novo',
  atualizado_em   timestamptz not null default now(),

  constraint pedidos_codigo_formato  check (codigo ~ '^[A-Z0-9]{4,8}$'),
  constraint pedidos_nome_tamanho    check (char_length(btrim(cliente_nome)) between 1 and 80),
  constraint pedidos_obs_tamanho     check (char_length(observacoes) <= 1000),
  constraint pedidos_itens_formato   check (public.pedido_itens_validos(itens)),
  constraint pedidos_total_confere   check (total_centavos = public.pedido_itens_total(itens)),
  constraint pedidos_status_valido   check (status in ('novo', 'confirmado', 'entregue', 'cancelado'))
);

create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);

-- Atualiza "atualizado_em" sempre que o status muda.
create or replace function public.pedidos_marcar_atualizacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists pedidos_atualizado_em on public.pedidos;
create trigger pedidos_atualizado_em
  before update on public.pedidos
  for each row execute function public.pedidos_marcar_atualizacao();


-- ------------------------------ TABELA ADMINS ------------------------------

create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text,
  criado_em timestamptz not null default now()
);

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- Diz se quem está logado é admin. Usada nas regras abaixo e pelo painel.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;


-- --------------------------- PERMISSÕES E REGRAS ---------------------------

alter table public.pedidos enable row level security;

-- Começa do zero e libera só o necessário.
revoke all on public.pedidos from anon, authenticated;

-- Visitante (e qualquer pessoa logada) só pode inserir estas colunas.
-- Data, status e "atualizado_em" ficam sempre com o valor do banco.
grant insert (id, codigo, cliente_nome, observacoes, itens, total_centavos)
  on public.pedidos to anon, authenticated;

-- Pessoa logada pode ler e mudar o status, mas as regras abaixo
-- limitam isso a quem está na tabela admins.
grant select on public.pedidos to authenticated;
grant update (status) on public.pedidos to authenticated;

drop policy if exists "site registra pedido novo" on public.pedidos;
create policy "site registra pedido novo"
  on public.pedidos for insert
  to anon, authenticated
  with check (status = 'novo');

drop policy if exists "admin ve pedidos" on public.pedidos;
create policy "admin ve pedidos"
  on public.pedidos for select
  to authenticated
  using ((select public.eh_admin()));

drop policy if exists "admin muda status" on public.pedidos;
create policy "admin muda status"
  on public.pedidos for update
  to authenticated
  using ((select public.eh_admin()))
  with check ((select public.eh_admin()));


-- =====================================================================
-- DEPOIS DE RODAR: liberar o painel para a confeiteira
--
-- 1. Authentication > Users > "Add user" > "Create new user":
--    e-mail e senha dela, com "Auto Confirm User" marcado.
-- 2. Rode a linha abaixo trocando o e-mail (mantenha as aspas simples):
--
--    insert into public.admins (user_id, email)
--    select id, email from auth.users where email = 'EMAIL_DELA@exemplo.com'
--    on conflict (user_id) do nothing;
--
-- 3. Authentication > Sign In / Providers > desligue "Allow new users to sign up"
--    (assim ninguém cria conta sozinho).
-- =====================================================================
