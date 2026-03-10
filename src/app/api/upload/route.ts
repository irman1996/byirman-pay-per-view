import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = 'nodejs'; // Ensure this runs in Node, not Edge

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

    const contentId = crypto.randomBytes(8).toString("hex");
    
    // 1. Upload original file to Vercel Blob
    const fileBlob = await put(`uploads/${contentId}-${file.name}`, file, {
      access: "public",
    });

    // 2. Upload metadata to Vercel Blob (as a JSON file)
    const metadata = {
      contentId,
      title,
      price,
      creatorAddress,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: fileBlob.url, // Store the blob URL instead of local path
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
    await put(`uploads/${contentId}.json`, metadataBuffer, {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({ success: true, contentId }, { status: 200 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
