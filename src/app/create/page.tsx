"use client";

import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState, useRef } from "react";
import Link from "next/link";
import "./create.css";

export default function CreatePage() {
  const { connected, account } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState("1");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !price || !account) return;
    setLoading(true);

    try {
      // Create a FormData to upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("price", price);
      formData.append("creatorAddress", account.address.toString());

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      const shareableLink = `${window.location.origin}/view/${data.contentId}`;
      setGeneratedLink(shareableLink);
    } catch (error) {
      console.error(error);
      alert("Error uploading file.");
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
