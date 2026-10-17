-- ari's shopping: the online product index (brief §9).
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- The website only ever READS (with the public/anon key, through the two
-- functions at the bottom). Your Mac's nightly crawl WRITES with the secret
-- key, which never leaves your Mac.

create table if not exists products (
  id text primary key,                 -- "<shop>:<shop's product id>"
  retailer_id text not null,
  retailer_name text not null,
  external_id text,
  url text not null,
  title text not null,
  brand text,
  category text,
  colour_raw text,
  colour_family text,
  price_gbp numeric(10,2) not null,
  was_price_gbp numeric(10,2),
  sizes_in_stock text[] not null default '{}',
  images text[] not null default '{}',
  is_resale boolean not null default false,
  last_seen_at timestamptz not null default now()
);

create index if not exists products_retailer on products (retailer_id);
create index if not exists products_seen on products (last_seen_at);
create index if not exists products_similar on products (category, colour_family, price_gbp);

-- Full-text search over title (most weight), brand, colour and category.
create or replace function product_doc(p products) returns tsvector
language sql immutable as $$
  select setweight(to_tsvector('english', coalesce(p.title, '')), 'A')
      || setweight(to_tsvector('simple', coalesce(p.brand, '')), 'B')
      || setweight(to_tsvector('simple', coalesce(p.colour_raw, '')), 'C')
      || setweight(to_tsvector('english', coalesce(p.category, '')), 'D')
$$;
create index if not exists products_fts on products using gin (product_doc(products));

create table if not exists crawl_runs (
  retailer_id text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  products integer,
  error text
);

-- Public can read products but never change them.
alter table products enable row level security;
alter table crawl_runs enable row level security;
drop policy if exists "anyone can read products" on products;
create policy "anyone can read products" on products for select using (true);

-- Every search word must match (prefixes allowed: "skir" finds "skirts").
create or replace function search_products(q text, lim int default 400)
returns setof products language sql stable as $$
  with terms as (
    select string_agg(lexeme || ':*', ' & ') as tsq
    from unnest(to_tsvector('english', q)) as t(lexeme, positions, weights)
  )
  select p.* from products p, terms
  where terms.tsq is not null and product_doc(p) @@ to_tsquery('english', terms.tsq)
  order by ts_rank(product_doc(p), to_tsquery('english', terms.tsq)) desc
  limit least(lim, 500)
$$;

-- Same category and colour family, similar price, closest title first.
create or replace function similar_products(p_id text, p_title text, p_category text, p_colour text, p_price numeric, lim int default 12)
returns setof products language sql stable as $$
  select * from products
  where id <> p_id and category = p_category and colour_family = p_colour
    and price_gbp between p_price * 0.6 and p_price * 1.6
  order by ts_rank(product_doc(products), plainto_tsquery('english', p_title)) desc,
           abs(price_gbp - p_price)
  limit least(lim, 40)
$$;

-- Old rows tidy themselves away (brief §9: not seen for 14 days).
create or replace function prune_stale() returns integer language sql as $$
  with gone as (delete from products where last_seen_at < now() - interval '14 days' returning 1)
  select count(*)::int from gone
$$;
