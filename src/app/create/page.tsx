"use client";

import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { useWallet, InputTransactionData } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network, AccountAddress } from "@aptos-labs/ts-sdk";
import { 
  type BlobCommitments, 
  createDefaultErasureCodingProvider, 
  generateCommitments,
  expectedTotalChunksets,
  ShelbyBlobClient,
  ShelbyClient
} from "@shelby-protocol/sdk/browser";
import { useState, useRef } from "react";
import Link from "next/link";
import "./create.css";

export default function CreatePage() {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState("1");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !price || !account) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // Initialize Aptos and Shelby clients
      const aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET }));
      
      const shelbyClient = new ShelbyClient({
        network: Network.TESTNET,
      });

      // 1. Encode File for Shelby
      setLoading(true);
      const data = Buffer.from(await file.arrayBuffer());
      const provider = await createDefaultErasureCodingProvider();
      const commitments: BlobCommitments = await generateCommitments(provider, data);

      // Convert the string address to the AccountAddress object expected by the SDK
      const creatorAddress = AccountAddress.fromString(account.address.toString());

      // 2. Register On-Chain
      const payload = ShelbyBlobClient.createRegisterBlobPayload({
        account: creatorAddress,
        blobName: file.name,
        blobMerkleRoot: commitments.blob_merkle_root,
        numChunksets: expectedTotalChunksets(commitments.raw_data_size),
        expirationMicros: (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000, // 30 days
        blobSize: commitments.raw_data_size,
        encoding: 1, // Required by the SDK
      });

      const transaction: InputTransactionData = { data: payload as any };
      const transactionSubmitted = await signAndSubmitTransaction(transaction);
      
      await aptosClient.waitForTransaction({
        transactionHash: transactionSubmitted.hash,
      });

      // 3. Upload File Data to Shelby RPC
      await shelbyClient.rpc.putBlob({
        account: creatorAddress,
        blobName: file.name,
        blobData: new Uint8Array(await file.arrayBuffer()),
      });

      // 4. Save Metadata to Vercel (so our DB knows the price and title)
      // The contentId is now the Shelby object path for this account + filename
      // For URL safety, we hash it to create a short ID for the link
      const formData = new FormData();
      formData.append("file", new Blob(["mock"], { type: "text/plain" }), `mock-${file.name}`); // We don't upload the real file to Vercel anymore!
      formData.append("title", title);
      formData.append("price", price);
      formData.append("creatorAddress", account.address.toString());
      formData.append("shelbyBlobName", file.name); // Track the exact filename uploaded to Shelby

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Metadata Upload failed");
      const metadataRes = await res.json();
      
      const shareableLink = `${window.location.origin}/view/${metadataRes.contentId}`;
      setGeneratedLink(shareableLink);
    } catch (error: any) {
      console.error(error);
      const msg = error?.message || String(error);
      
      if (msg.includes("INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE")) {
        setErrorMessage(
          <span>
            You don't have enough APT to pay for the gas fee. Please visit the{" "}
            <a href={`https://aptos.dev/network/faucet?address=${account.address}`} target="_blank" rel="noreferrer" className="text-link">Aptos Faucet</a>
            {" "}to fund your wallet.
          </span>
        );
      } else if (msg.includes("E_INSUFFICIENT_FUNDS")) {
        setErrorMessage(
          <span>
            You don't have enough ShelbyUSD to pay for storage. Please visit the{" "}
            <a href={`https://devnet.shelby.xyz/tap?address=${account.address}`} target="_blank" rel="noreferrer" className="text-link">Shelby Faucet</a>
            {" "}to fund your wallet.
          </span>
        );
      } else if (msg.includes("EBLOB_WRITE_CHUNKSET_ALREADY_EXISTS")) {
         setErrorMessage("This exact file has already been uploaded to Shelby. Try renaming it.");
      } else {
        setErrorMessage("Upload failed: " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container">
      <header className="header glass-panel">
        <Link href="/">
          <h1 className="logo gradient-text">ByIrman</h1>
        </Link>
        <div className="wallet-container">
          <WalletSelector />
        </div>
      </header>

      <section className="hero">
        <h2 className="hero-title">Monetize Your Digital Content Instantly</h2>
        <p className="hero-subtitle">
          Upload a high-quality video, PDF, or file. Set a price in APT. Get a shareable link that requires payment to unlock.
        </p>

        {!connected ? (
          <div className="connect-prompt glass-panel">
            <h3>Connect your Aptos Wallet to start creating</h3>
          </div>
        ) : generatedLink ? (
          <div className="success-panel glass-panel">
            <h3>Link Generated! 🎉</h3>
            <p>Share this link with your audience. They will need to pay {price} APT to unlock and view the content.</p>
            <div className="link-box">
              <input type="text" readOnly value={generatedLink} className="input" />
              <button 
                className="btn btn-primary"
                onClick={() => navigator.clipboard.writeText(generatedLink)}
              >
                Copy
              </button>
            </div>
            <Link href={generatedLink.replace(window.location.origin, "")}>
              <button className="btn btn-secondary mt-2">Preview as Viewer</button>
            </Link>
          </div>
        ) : (
          <form className="upload-form glass-panel" onSubmit={handleUpload}>
            {errorMessage && (
              <div className="error-alert">
                {errorMessage}
              </div>
            )}
            
            <div className="form-group">
              <label>Content Title</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. 4K Wallpaper Pack or Ultimate Guide PDF" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Upload File</label>
              <div 
                className={`file-drop-zone ${file ? "has-file" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <span className="file-name">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                ) : (
                  <span>Click to select file (Video, PDF, ZIP)</span>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required 
                  hidden
                />
              </div>
            </div>

            <div className="form-group">
              <label>Price (APT)</label>
              <input 
                type="number" 
                className="input" 
                min="0.01" 
                step="0.01" 
                placeholder="e.g. 1.0" 
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={loading || !file || !title}>
              {loading ? "Uploading & Generating Link..." : "Generate Unlockable Link"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
