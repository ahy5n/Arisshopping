-- ari's shopping: faster catalogue search (run once in Supabase → SQL Editor).
-- With 400k+ products, building each product's search text on the fly made
-- broad searches like "black dress" time out. This stores it once, indexed.
-- Takes a minute or so on a big catalogue. Safe to re-run.

set statement_timeout = '10min';

-- 1. the searchable text, stored and indexed
alter table products add column if not exists doc tsvector generated always as (
  setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A')
  || setweight(to_tsvector('simple'::regconfig, coalesce(brand, '')), 'B')
  || setweight(to_tsvector('simple'::regconfig, coalesce(colour_raw, '')), 'C')
  || setweight(to_tsvector('english'::regconfig, coalesce(category, '')), 'D')
) stored;
create index if not exists products_doc on products using gin (doc);

-- the old on-the-fly index isn't used any more; dropping it frees space
drop index if exists products_fts;

-- 2. search: every word must match (prefixes allowed). Only the first 3,000
--    matches are ranked, so even very broad searches stay fast.
create or replace function search_products(q text, lim int default 400)
returns setof products language sql stable as $$
  with terms as (
    select to_tsquery('english', string_agg(lexeme || ':*', ' & ')) as tsq
    from unnest(to_tsvector('english', q)) as t(lexeme, positions, weights)
  ),
  hits as (
    select p.*, ts_rank(p.doc, terms.tsq) as r
    from products p, terms
    where terms.tsq is not null and p.doc @@ terms.tsq
    limit 3000
  )
  select id, retailer_id, retailer_name, external_id, url, title, brand, category, colour_raw, colour_family,
         price_gbp, was_price_gbp, sizes_in_stock, images, is_resale, last_seen_at, doc
  from hits order by r desc limit least(lim, 500)
$$;

-- 3. similar items use the stored text too
create or replace function similar_products(p_id text, p_title text, p_category text, p_colour text, p_price numeric, lim int default 12)
returns setof products language sql stable as $$
  with candidates as (
    select * from products
    where id <> p_id and category = p_category and colour_family = p_colour
      and price_gbp between p_price * 0.6 and p_price * 1.6
    limit 2000
  )
  select * from candidates
  order by ts_rank(doc, plainto_tsquery('english', p_title)) desc, abs(price_gbp - p_price)
  limit least(lim, 40)
$$;

-- 4. how much of the 500 MB free allowance is used
select pg_size_pretty(pg_database_size(current_database())) as database_size;
