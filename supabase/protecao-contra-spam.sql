-- =====================================================================
-- D'Ivna Confeitaria — proteção do banco contra pedidos falsos em massa
--
-- COMO USAR: no Supabase, abra "SQL Editor" > "New query", cole TODO este
-- arquivo e clique em "Run". Pode rodar de novo sem problema (não apaga pedidos).
-- Rode DEPOIS do arquivo pedidos.sql.
--
-- O que faz:
--   1. Limita quantos pedidos novos o banco aceita por minuto e por hora, no total.
--      Um robô que mande milhares de pedidos falsos passa a ser barrado, e o painel
--      e o espaço do plano grátis ficam a salvo.
--      (Se o banco recusar, o site não é afetado: o WhatsApp sempre abre antes.)
--   2. Recusa pedidos com valor total zerado ou absurdo.
--
-- Para mudar os limites, edite os números marcados com "AJUSTE" e rode de novo.
-- =====================================================================


-- ---------------- 1. Limite de pedidos novos (total do site) ----------------

create or replace function public.pedidos_limitar_enxurrada()
returns trigger
language plpgsql
security definer          -- precisa contar os pedidos, algo que o visitante não pode fazer
set search_path = ''
as $$
declare
  no_ultimo_minuto integer;
  na_ultima_hora   integer;
begin
  select count(*) filter (where criado_em > now() - interval '1 minute'),
         count(*)
    into no_ultimo_minuto, na_ultima_hora
    from public.pedidos
   where criado_em > now() - interval '1 hour';

  -- AJUSTE: até 15 pedidos por minuto e 150 por hora, somando todos os visitantes.
  if no_ultimo_minuto >= 15 or na_ultima_hora >= 150 then
    raise exception 'Muitos pedidos em pouco tempo. Tente de novo em alguns minutos.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.pedidos_limitar_enxurrada() from public, anon, authenticated;

drop trigger if exists pedidos_limitar_enxurrada on public.pedidos;
create trigger pedidos_limitar_enxurrada
  before insert on public.pedidos
  for each row execute function public.pedidos_limitar_enxurrada();


-- ---------------- 2. Valor total dentro do razoável ----------------

alter table public.pedidos drop constraint if exists pedidos_total_limite;
-- AJUSTE: entre R$ 0,01 e R$ 50.000,00 (valores em centavos).
alter table public.pedidos
  add constraint pedidos_total_limite check (total_centavos between 1 and 5000000);
