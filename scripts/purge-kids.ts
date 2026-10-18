/**
 * Removes children's clothes from the local catalogue (see lib/kids.ts).
 * New crawls skip them anyway; run sync-supabase afterwards to remove them online.
 *
 *   npx tsx scripts/purge-kids.ts
 */
import { DatabaseSync } from "node:sqlite";
import { isKids } from "../lib/kids";

const db = new DatabaseSync(new URL("../data/catalogue.db", import.meta.url).pathname);
const rows = db.prepare("select id, title, url from products").all() as { id: string; title: string; url: string }[];
const kids = rows.filter((r) => isKids(r.title ?? "", r.url ?? ""));
const del = db.prepare("delete from products where id = ?");
db.exec("begin");
for (const r of kids) del.run(r.id);
db.exec("commit");
console.log(`removed ${kids.length.toLocaleString()} children's items · ${(rows.length - kids.length).toLocaleString()} left`);
