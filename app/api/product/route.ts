import { getProduct, similarTo } from "@/lib/index-store";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  ?id=…         a product from the index, plus similar items
 * POST {product}     similar items for a product the client already has (live results aren't all indexed)
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const product = await getProduct(id);
  if (!product) return Response.json({ product: null, similar: [] }, { status: 404 });
  return Response.json({ product, similar: await similarTo(product).catch(() => []) });
}

export async function POST(req: Request) {
  const { product } = (await req.json()) as { product: Product };
  if (!product?.offers?.length) return Response.json({ similar: [] }, { status: 400 });
  return Response.json({ similar: await similarTo(product).catch(() => []) });
}
