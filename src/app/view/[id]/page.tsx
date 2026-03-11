"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { SHELBYUSD_FA_METADATA_ADDRESS } from "@shelby-protocol/sdk/browser";
import { useParams } from "next/navigation";
import Link from "next/link";
import "./view.css";

export default function ViewPage() {
  const params = useParams();
  const id = params.id as string;
  
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockedContentUrl, setUnlockedContentUrl] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/content/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setMetadata(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleUnlock = async () => {
    if (!account || !metadata) return;
    setUnlocking(true);

    try {
      // 1. Convert APT to Octas (1 APT = 10^8 Octas)
      const amountInOctas = Math.floor(parseFloat(metadata.price) * 100000000);

      let transaction: any;

      if (metadata.currency === "SHELBYUSD") {
        // Transfer ShelbyUSD Fungible Asset
        transaction = {
          data: {
            function: "0x1::primary_fungible_store::transfer",
            typeArguments: ["0x1::fungible_asset::Metadata"],
            functionArguments: [SHELBYUSD_FA_METADATA_ADDRESS, metadata.creatorAddress, amountInOctas.toString()],
          },
        };
      } else {
        // Transfer Native APT Coin
        transaction = {
          data: {
            function: "0x1::aptos_account::transfer",
            typeArguments: [],
            functionArguments: [metadata.creatorAddress, amountInOctas],
          },
        };
      }

      // 3. Sign and submit
      const response = await signAndSubmitTransaction(transaction);
      
      // 4. Wait for transaction dynamically on the correct network
      const aptos = new Aptos(new AptosConfig({ 
        network: metadata.network as Network || Network.TESTNET,
        fullnode: metadata.fullnodeUrl
      }));
      const executedTransaction = await aptos.waitForTransaction({ transactionHash: response.hash });
      
      if (!executedTransaction.success) {
        throw new Error("Transaction failed on chain");
      }

      // 5. Verify transaction with backend to get the actual file URL
      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: id,
          transactionHash: response.hash,
          viewerAddress: account.address,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.downloadUrl) {
        setUnlockedContentUrl(verifyData.downloadUrl);
      } else {
        throw new Error(verifyData.error || "Verification failed");
      }
    } catch (error: any) {
      console.error(error);
      alert(`Payment or verification failed: ${error.message}`);
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return <div className="center-screen"><div className="loader"></div></div>;
  }

  if (!metadata) {
    return (
      <div className="center-screen">
        <h2>Content not found</h2>
        <Link href="/" className="btn btn-secondary mt-2">Go Home</Link>
      </div>
    );
  }

  return (
    <main className="view-container">
      <header className="header glass-panel">
        <Link href="/">
          <h1 className="logo gradient-text">ByIrman</h1>
        </Link>
        <div className="wallet-container">
          <WalletSelector />
        </div>
      </header>

      <section className="content-panel glass-panel">
        <div className="content-icon">
          {metadata.fileType?.includes("video") ? "🎥" : metadata.fileType?.includes("pdf") ? "📄" : "📁"}
        </div>
        
        <h2 className="content-title">{metadata.title}</h2>
        <div className="metadata-pills">
          <span className="pill">{metadata.shelbyBlobName}</span>
          <span className="pill">Web3 Storage (Shelby)</span>
        </div>

        <div className="divider"></div>

        {unlockedContentUrl ? (
          <div className="unlocked-state">
            <h3 className="success-text">🎉 Unlocked Successfully!</h3>
            <p>You can now download your content.</p>
            <a href={unlockedContentUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-large w-full" download={metadata.shelbyBlobName}>
              Download {metadata.shelbyBlobName}
            </a>
          </div>
        ) : (
          <div className="locked-state">
            <div className="price-tag">
              <span className="price-label">Price to Unlock</span>
              <span className="price-value">{metadata.price} {metadata.currency || "APT"}</span>
            </div>
            
            {!connected ? (
              <div className="connect-wrapper">
                <p>Please connect your wallet to pay and unlock this content.</p>
              </div>
            ) : (
              <button 
                className="btn btn-primary btn-large w-full pay-btn" 
                onClick={handleUnlock}
                disabled={unlocking}
              >
                {unlocking ? "Processing Payment & Unlocking..." : `Pay ${metadata.price} ${metadata.currency || "APT"} to Unlock`}
              </button>
            )}
            <p className="security-note">Payment is sent directly to the creator's wallet ({metadata.creatorAddress.slice(0,6)}...{metadata.creatorAddress.slice(-4)}).</p>
          </div>
        )}
      </section>
    </main>
  );
}
