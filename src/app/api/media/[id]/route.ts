import { NextRequest, NextResponse } from "next/server";
import { getMedia } from "@/lib/store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const item = getMedia(id);

  if (!item) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const total = item.buffer.length;
  const range = req.headers.get("range");

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const chunksize = end - start + 1;
    const chunk = item.buffer.subarray(start, end + 1);

    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunksize),
        "Content-Type": item.mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse(new Uint8Array(item.buffer), {
    status: 200,
    headers: {
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Content-Type": item.mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
