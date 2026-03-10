import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const uploadDir = path.join(process.cwd(), "uploads");
    
    // Verify token
    const tokensPath = path.join(uploadDir, `${id}.tokens.json`);
    const tokensRaw = await readFile(tokensPath, "utf-8");
    const tokens = JSON.parse(tokensRaw);

    if (!tokens.includes(token)) {
      return new NextResponse("Invalid or expired token", { status: 403 });
    }

    // Fetch metadata to find file
    const metadataPath = path.join(uploadDir, `${id}.json`);
    const metadataRaw = await readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataRaw);

    // Read and stream file
    const fileBuffer = await readFile(metadata.filePath);

    return new NextResponse(fileBuffer, {
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
