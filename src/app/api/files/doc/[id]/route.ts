import { getActor } from "@/lib/auth";
import { getDocumentForDownload } from "@/lib/services/files";

/** Private documents: every request is authorised and audited. Unauthorised → 404 (no existence leak). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { doc, data } = await getDocumentForDownload(await getActor(), id);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": doc.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalFilename)}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
