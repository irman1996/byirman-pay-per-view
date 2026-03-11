import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import crypto from "crypto";

export const runtime = 'nodejs'; // Ensure this runs in Node, not Edge

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    // The "file" is now just a dummy mock file sent from frontend because real file is in Shelby
    const title = formData.get("title") as string;
    const price = formData.get("price") as string;
    const currency = formData.get("currency") as string || "APT";
    const creatorAddress = formData.get("creatorAddress") as string;
    const shelbyBlobName = formData.get("shelbyBlobName") as string;

    if (!title || !price || !creatorAddress || !shelbyBlobName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const network = formData.get("network") as string || "testnet";

    const contentId = crypto.randomBytes(8).toString("hex");

    const metadata = {
      contentId,
      title,
      price,
      currency,
      creatorAddress,
      shelbyBlobName, // The exact file name uploaded to Shelby
      network
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
    await put(`uploads/${contentId}.json`, metadataBuffer, {
      access: "public",
      contentType: "application/json",
    });

    return NextResponse.json({ success: true, contentId }, { status: 200 });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload metadata" }, { status: 500 });
  }
}
