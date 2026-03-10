"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { PropsWithChildren } from "react";

// For demo purposes, we will only use Petra wallet
const wallets = [new PetraWallet()];

export function WalletProvider({ children }: PropsWithChildren) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      onError={(error) => {
        console.error("Wallet Error", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
