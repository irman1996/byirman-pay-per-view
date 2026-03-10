import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify token from Vercel Blob
    const { blobs: tokenBlobs } = await list({ prefix: `uploads/${id}.tokens.json`, limit: 1 });
    if (!tokenBlobs || tokenBlobs.length === 0) {
      return new NextResponse("Invalid or expired token", { status: 403 });
    }
    const tR = await fetch(tokenBlobs[0].url);
    const tokens = await tR.json();

    if (!tokens.includes(token)) {
      return new NextResponse("Invalid or expired token", { status: 403 });
    }

    // Fetch metadata to find file url
    const { blobs: metaBlobs } = await list({ prefix: `uploads/${id}.json`, limit: 1 });
    if (!metaBlobs || metaBlobs.length === 0) {
      return new NextResponse("Content not found", { status: 404 });
    }
    const metaRes = await fetch(metaBlobs[0].url);
    const metadata = await metaRes.json();

    // Stream the file directly to client from the blob URL
    const fileRes = await fetch(metadata.fileUrl);

    return new NextResponse(fileRes.body, {
      status: 200,
      headers: {
        "Content-Type": metadata.fileType,
        "Content-Disposition": `attachment; filename="${metadata.fileName}"`,
      },
    });

  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("File not found or error occurred", { status: 404 });
  }
}
