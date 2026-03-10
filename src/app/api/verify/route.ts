import { NextResponse } from "next/server";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { put, list } from "@vercel/blob";
import crypto from "crypto";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

export async function POST(req: Request) {
  try {
    const { contentId, transactionHash, viewerAddress } = await req.json();

    if (!contentId || !transactionHash || !viewerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch metadata from Blob
    const { blobs: metaBlobs } = await list({ prefix: `uploads/${contentId}.json`, limit: 1 });
    if (!metaBlobs || metaBlobs.length === 0) {
        return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    const metaRes = await fetch(metaBlobs[0].url);
    const metadata = await metaRes.json();

    // 2. Fetch transaction from blockchain
    const tx: any = await aptos.getTransactionByHash({ transactionHash });
    
    // 3. Verify transaction
    if (!tx.success) {
      return NextResponse.json({ error: "Transaction failed on chain" }, { status: 400 });
    }

    const payload = tx.payload;
    if (
      payload.type !== "entry_function_payload" ||
      payload.function !== "0x1::aptos_account::transfer"
    ) {
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }

    const [recipientArg, amountArg] = payload.arguments;
    const recipientAddress = typeof recipientArg === "string" ? recipientArg : recipientArg.toString();
    const amountInOctas = typeof amountArg === "string" ? amountArg : amountArg.toString();
    const expectedAmount = Math.floor(parseFloat(metadata.price) * 100000000).toString();

    if (recipientAddress.toLowerCase() !== metadata.creatorAddress.toLowerCase()) {
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
    }

    if (amountInOctas !== expectedAmount) {
      return NextResponse.json({ error: "Invalid amount paid" }, { status: 400 });
    }

    if (tx.sender.toLowerCase() !== viewerAddress.toLowerCase()) {
         return NextResponse.json({ error: "Invalid sender" }, { status: 400 });
    }

    // 4. Generate access token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Fetch existing tokens from Blob (if any)
    let tokens: string[] = [];
    const { blobs: tokenBlobs } = await list({ prefix: `uploads/${contentId}.tokens.json`, limit: 1 });
    if (tokenBlobs && tokenBlobs.length > 0) {
        const tR = await fetch(tokenBlobs[0].url);
        if (tR.ok) {
            tokens = await tR.json();
        }
    }
    
    tokens.push(token);
    
    // Write updated tokens array back to Blob
    const tokensBuffer = Buffer.from(JSON.stringify(tokens));
    await put(`uploads/${contentId}.tokens.json`, tokensBuffer, {
      access: "public",
      contentType: "application/json",
    });

    const downloadUrl = `/api/download/${contentId}?token=${token}`;
    return NextResponse.json({ success: true, downloadUrl }, { status: 200 });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed internally" }, { status: 500 });
  }
}
