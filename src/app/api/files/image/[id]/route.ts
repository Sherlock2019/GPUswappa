import { getActor } from "@/lib/auth";
import { getImageForServe } from "@/lib/services/files";

/** Listing images: public when approved on a published listing, otherwise seller/authorised staff only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { data, contentType, isPublic } = await getImageForServe(await getActor(), id);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isPublic ? "public, max-age=3600" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
        // Neutral filename: never the original upload name (could identify a party)
        "Content-Disposition": `inline; filename="image-${id.slice(-6)}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
