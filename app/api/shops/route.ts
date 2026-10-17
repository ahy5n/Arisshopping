import { shopStatus } from "@/adapters";
import { RETAILERS } from "@/config/retailers";

export const dynamic = "force-dynamic";

export type ShopRow = { id: string; name: string; section: string; find: string; state: ReturnType<typeof shopStatus>["state"]; note?: string };

export function GET() {
  const rows: ShopRow[] = RETAILERS.map((r) => ({ id: r.id, name: r.name, section: r.section, find: r.find, ...shopStatus(r.id) }));
  return Response.json(rows);
}
