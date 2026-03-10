import { NextResponse } from "next/server";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

export async function POST(req: Request) {
  try {
    const { contentId, transactionHash, viewerAddress } = await req.json();

    if (!contentId || !transactionHash || !viewerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch metadata
    const uploadDir = path.join(process.cwd(), "uploads");
    const metadataPath = path.join(uploadDir, `${contentId}.json`);
    const metadataRaw = await readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataRaw);

    // 2. Fetch transaction from blockchain
    const tx: any = await aptos.getTransactionByHash({ transactionHash });
    
    // 3. Verify transaction
    if (!tx.success) {
      return NextResponse.json({ error: "Transaction failed on chain" }, { status: 400 });
    }

    // Verify it's a coin transfer
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

    // In a real app we'd compare the exact hex addresses, but they might differ slightly in zero padding.
    // For MVP we just compare them ignoring case
    if (recipientAddress.toLowerCase() !== metadata.creatorAddress.toLowerCase()) {
      return NextResponse.json({ error: "Invalid recipient" }, { status: 400 });
    }

    // Allow some tiny variation due to JS floating point math, but ideally it should match exactly
    if (amountInOctas !== expectedAmount) {
      return NextResponse.json({ error: "Invalid amount paid" }, { status: 400 });
    }

    // Verify the sender
    if (tx.sender.toLowerCase() !== viewerAddress.toLowerCase()) {
         return NextResponse.json({ error: "Invalid sender" }, { status: 400 });
    }

    // 4. Everything is valid! Generate an access token
    const token = crypto.randomBytes(32).toString("hex");
    
    // Save token to tokens file
    const tokensPath = path.join(uploadDir, `${contentId}.tokens.json`);
    let tokens: string[] = [];
    try {
      const tokensRaw = await readFile(tokensPath, "utf-8");
      tokens = JSON.parse(tokensRaw);
    } catch (e) {
      // file doesn't exist
    }
    
    tokens.push(token);
    await writeFile(tokensPath, JSON.stringify(tokens));

    // Return the download URL
    const downloadUrl = `/api/download/${contentId}?token=${token}`;
    
    return NextResponse.json({ success: true, downloadUrl }, { status: 200 });

  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed internally" }, { status: 500 });
  }
}
