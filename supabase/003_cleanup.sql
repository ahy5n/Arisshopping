-- ari's shopping: reclaim space after the big uploads (run in Supabase → SQL Editor).
--
-- Run these as TWO separate snippets: VACUUM won't run alongside other statements.
--
-- Snippet 1, on its own (takes a minute or two):
vacuum full products;

-- Snippet 2: drop the old age-based clean-up (uploads now delete removed products
-- themselves) and show the new size.
-- drop function if exists prune_stale();
-- select pg_size_pretty(pg_database_size(current_database())) as database_size;
