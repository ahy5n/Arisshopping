# ari's shopping

One search across UK fashion shops, made for Ari. Private, phone-first, free tiers only.

## Where it's at

**Ready to use.** Searches go to 44 real shops at once and stream into the feed as each
one answers (all of them within about 3 seconds). Filters, sorting and wishlist work on real products.

| Phase | | Status |
|---|---|---|
| 1 | Skeleton, design system | done |
| 2 | Live shop adapters, streaming search | done |
| 3 | Detail view, cross-shop grouping, similar items | done |
| 4 | Catalogue index and crawl | done locally; online index needs Supabase (see Deploying) |
| 5 | Natural-language search | skipped for now (needs a Gemini key) |
| 6 | Saved searches | done; price-drop emails and move-to-new-phone dropped |
| 7 | Polish and deploy | done; deploy needs your Vercel account |

### Shops

All 100 shops from `aris-shopping-retailers.pdf` are in `config/retailers.ts`; their latest status
is in `config/probe-results.json` and shown in Settings. **44 search live** (42 from the list, plus
Coast and Oasis). Five ways in, cheapest first:

| How | Shops |
|---|---|
| Shopify's public search JSON (`_shopify.ts`, automatic) | Boden, Club L London, Fenwick, Jigsaw, Rixo, Never Fully Dressed, Kitri, Nobody's Child, Browns, Oh Polly, Meshki, Motel Rocks, Princess Polly, Adanola, Hardly Ever Worn It |
| Algolia, with the search-only key each site ships (`_boohoo-group.ts`, `algolia-shops.ts`) | Boohoo, PrettyLittleThing, Nasty Gal, Misspap, Coast, Oasis, Flannels, House of Fraser, Gymshark, END. |
| The shop's own search JSON (`zara.ts`) | Zara |
| Reading the shop's search results page (`_page.ts`: product tiles, JSON-LD, or embedded app state) | M&S, John Lewis, Harvey Nichols, Mytheresa, & Other Stories, Whistles, Hobbs, Phase Eight, Monsoon, Accessorize, Sandro, Maje, Ganni, ME+EM, Tu, Office, Dune, Boux Avenue |
| Official API (needs a free key) | eBay UK |

Not searchable yet:
- **Blocked (32):** refuse a plain, honestly-labelled request (403/429/bot challenge), on the home
  page or the search page: H&M, Mango, Next, Gap, COS, Arket, Reformation, Selfridges, Net-a-Porter,
  SSENSE, Farfetch, Lululemon, Depop, Vestiaire and others. Per the brief these are left alone. The legitimate route is
  affiliate product feeds (Awin, Rakuten, CJ), which need an account in your name.
- **Need a bespoke adapter (~21):** load fine but fetch results with private GraphQL/JS after the
  page loads (ASOS, River Island, New Look, Primark, Matalan, Nike, Kurt Geiger, Sézane, Ghost,
  Sweaty Betty, Vinted, Bershka/Pull&Bear/Stradivarius/Massimo Dutti, …). Bershka's Algolia key is locked to
  its own website, so it isn't usable from here.
- **Gone or moved (3):** White Stuff and Liberty didn't answer; Charles & Keith's listed URL 404s.
- **Not in pounds:** White Fox (USD only).

Fixes to the list: Boden searches at boden.com; Club L London is now clubllondon.com (club-l.com
belongs to a bar in Japan).

Shopify results have no sizes yet (their search JSON doesn't include them); the phase 4
nightly crawl fills those in from `/products.json`.

## Run it

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and use your browser's phone view (390px wide).

```bash
npm run test:adapters          # one live sample search per shop, checks the output shape
ONLY=rixo,boohoo npm run test:adapters
npm run probe                  # re-check all 100 shops (≈2 requests each)
npm run probe -- asos zara     # just these
npx tsx scripts/probe-pages.ts # which shops the page reader can parse (config/search-pages.ts)
npx tsx scripts/fingerprint.ts # guess each shop's platform and search provider
```

### Refreshing the catalogue (by hand)

ASOS, Zara, John Lewis, Harvey Nichols, Mytheresa and & Other Stories turn away Vercel's servers but
answer from home, so the live site gets them from the catalogue. To refresh it (prices, new stock),
run this on the Mac, ideally a couple of times a week:

```bash
./scripts/refresh.sh        # crawls every shop, then uploads to Supabase; log in logs/refresh.log
```

macOS won't let scheduled background jobs into the Documents folder, so it isn't automatic.

### Picked for you

The home page learns from what Ari hearts (strong signal) and opens (weak signal): favourite
categories, colours, brands, shops and price range (`lib/taste.ts`). `/api/foryou` gathers items
similar to each heart plus more from her favourite brands, ranks them by fit, caps any one shop or
brand, and never shows the same shop twice in a row. It all stays on her phone; only the item
snapshots are sent when asking for picks.

### The catalogue index

```bash
npm run crawl                  # every live shop; writes data/catalogue.db
npm run crawl -- zara rixo     # just these
```

Searches answer from this index instantly (≈0.2s), then live results refresh prices and add
anything new. Shopify shops are read in full from `/products.json` (with sizes and stock); every
other shop is swept with ~40 women's category searches of up to 1,000 results each. Last run:
188,834 products from 44 shops. Products unseen for 14 days are dropped; every price change is kept
in `price_history`. It's a local SQLite file for now; on
deploy it moves to Supabase (same tables as brief §9) and the crawl runs nightly on GitHub Actions.

### Adding a shop

- **Shopify store:** nothing to write. Run `npm run probe -- <id>`; if it reports `shopify` in GBP
  it's picked up automatically.
- **Server-rendered search page:** add its search URL to `config/search-pages.ts` and run
  `npx tsx scripts/probe-pages.ts <id>`. If it reports ✓, it's live.
- **Anything else:** add `adapters/<id>.ts` exporting a `RetailerAdapter` (see `lib/types.ts`),
  register it in `adapters/index.ts`, and use `politeFetch` + `cached` from `adapters/http.ts` so
  the polite-scraping rules (honest user agent, 8s timeout, 1.5s gap per shop, 30-minute cache)
  apply. `search` must never throw; return `[]` on failure.

## Layout

```
app/            pages: search, wishlist, saved, settings
components/     UI pieces (cards, filters, search bar, nav, doodles)
lib/types.ts    Product, Filters, and the RetailerAdapter interface from the brief
lib/catalogue.ts colours, shade map, categories, sizes
lib/palettes.ts the six colour schemes (Lilac haze is the default)
adapters/       one file per shop; _shopify.ts and _boohoo-group.ts are shared
config/         the 100 retailers and the latest probe results
app/api/search  streams results as NDJSON, one line per shop
scripts/        probe-shops.ts
```

## Decisions not in the brief

- **Colour schemes.** Six palettes, each with light and dark versions, picked in Settings. Lilac haze
  is the default (Ari's pick). The brief's Blush palette is kept as an option.
- **Placeholder art.** Products without a picture get a flat fashion sketch in their colour.
- **"Best match" order** takes each shop's #1, then each shop's #2, and so on, so no single shop
  floods the top of the feed.
- **Same item, several shops** (`lib/group.ts`). Exact product codes merge first (Boohoo group,
  Frasers group). Otherwise: same brand + same colour family + title trigram similarity ≥ 0.6, with
  two guards learned from real data: titles must have ≥ 2 meaningful words ("Women's Dress" alone
  never groups), and prices must be within ~3× of each other. Department stores that put the brand in
  the title ("Hobbs Rae Dress" under John Lewis) are matched to the real brand. Resale never groups
  with new.
- **Detail view** opens instantly from the feed (cards remember what they showed) and falls back to
  the index for direct links. Similar items come from the index: same category and colour family,
  price within 0.6–1.6×, ranked by title match.
- **Saved searches** keep the query plus every filter, with a name she can edit; one tap re-runs it.
- **Going back** from a product restores the same feed, filters and scroll position without
  re-asking the shops (results are kept for 10 minutes).
- **Home screen:** a web app manifest and a generated heart icon, so "Add to Home Screen" opens it
  full-screen like an app.
- **Wishlist** stores a snapshot of each item on the device; prices refresh once the phase 4 crawl exists.
- **Shoe sizes** are stored as "shoe 5" internally so they never mix with dress size 5.
- **Fonts.** Fraunces (soft, slightly wonky serif), DM Sans for body text, and Caveat for small
  handwritten notes ("pre-loved", "just in").
- **Dev server** uses webpack locally (`next dev --webpack` in `.claude/launch.json`), because
  Turbopack couldn't spawn its CSS worker in the sandbox this was built in. Plain `npm run dev`
  should work on a normal machine.

## Deploying

1. Put this folder in a GitHub repo (private is fine).
2. On [vercel.com](https://vercel.com) (free Hobby plan): **Add New → Project**, import the repo,
   keep the defaults, deploy. Node 22 is picked up from `package.json`.
3. Optional: add `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` in Vercel → Settings → Environment Variables.
4. On her phone, open the site in Safari → Share → **Add to Home Screen**.

Live search across all 44 shops works straight away. **The 188k-product index does not travel with
the deploy**: it's a 248 MB SQLite file, and Vercel functions top out at 250 MB. Without it the site
simply searches live (a little slower, ~2–3s, and capped at ~40 results per shop). To bring the index
online: create a free Supabase project, and the same three tables (`products`, `price_history`,
`crawl_runs`) move over with `pg_trgm` for fuzzy search, filled by `npm run crawl` on a nightly
GitHub Actions schedule. That last step needs your Supabase and GitHub accounts.

### Notes for later
- Inditex (Bershka, Pull&Bear, Stradivarius, Massimo Dutti), ASOS, River Island, New Look, Primark,
  Matalan, Nike, Kurt Geiger and a few others need bespoke adapters.
- The 32 blocked shops can come in through affiliate feeds (Awin etc.) with an account in your name.
