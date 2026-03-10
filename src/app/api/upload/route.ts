import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const price = formData.get("price") as string;
    const creatorAddress = formData.get("creatorAddress") as string;

    if (!file || !title || !price || !creatorAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentId = crypto.randomBytes(8).toString("hex");
    
    // Save file and metadata
    const uploadDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, `${contentId}-${file.name}`);
    await writeFile(filePath, buffer);

    const metadata = {
      contentId,
      title,
      price,
      creatorAddress,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      filePath, 
    };

    const metadataPath = path.join(uploadDir, `${contentId}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({ success: true, contentId }, { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
