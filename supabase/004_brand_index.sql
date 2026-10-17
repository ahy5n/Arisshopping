-- ari's shopping: fast brand lookups (run once in Supabase → SQL Editor).
-- Searches like "H&M dress" look products up by exact brand; without this
-- index they scan the whole catalogue and time out. Safe to re-run.

set statement_timeout = '10min';

create index if not exists products_brand on products (brand);

select pg_size_pretty(pg_database_size(current_database())) as database_size;
