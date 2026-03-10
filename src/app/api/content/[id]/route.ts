import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Find the metadata json file
    const { blobs } = await list({
      prefix: `uploads/${id}.json`,
      limit: 1,
    });

    if (!blobs || blobs.length === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    // Fetch the JSON from the public blob URL
    const res = await fetch(blobs[0].url);
    if (!res.ok) throw new Error("Failed to fetch metadata");
    const metadata = await res.json();

    // Don't send file path/url to client for security
    const { fileUrl, ...safeMetadata } = metadata;
    
    return NextResponse.json(safeMetadata, { status: 200 });
  } catch (error) {
    console.error("Metadata error:", error);
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
}
