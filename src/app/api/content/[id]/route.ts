import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const uploadDir = path.join(process.cwd(), "uploads");
    const metadataPath = path.join(uploadDir, `${id}.json`);
    
    const data = await readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(data);

    // Don't send file path to client for security
    const { filePath, ...safeMetadata } = metadata;
    
    return NextResponse.json(safeMetadata, { status: 200 });
  } catch (error) {
    console.error("Metadata error:", error);
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }
}
