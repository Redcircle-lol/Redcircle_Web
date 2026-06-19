import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";
import { clusterApiUrl } from "@solana/web3.js";
import {
  hasInjectedSolanaProvider,
  isAndroidChrome,
  isInAppBrowser,
  isMobileDevice,
} from "@/lib/wallet-mobile";

import "@solana/wallet-adapter-react-ui/styles.css";

type WalletContextProviderProps = {
  children: ReactNode;
};

const APP_ORIGIN = "https://www.redcircle.lol";

export function WalletContextProvider({ children }: WalletContextProviderProps) {
  const network = (import.meta.env.VITE_SOLANA_NETWORK || "mainnet-beta") as "devnet" | "testnet" | "mainnet-beta";

  const endpoint = useMemo(() => {
    const customRpc = import.meta.env.VITE_SOLANA_RPC_URL;
    return customRpc || clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(() => {
    const mobileMwa = new SolanaMobileWalletAdapter({
      addressSelector: createDefaultAddressSelector(),
      appIdentity: {
        name: "Redcircle",
        uri: APP_ORIGIN,
        icon: `${APP_ORIGIN}/logo.png`,
      },
      authorizationResultCache: createDefaultAuthorizationResultCache(),
      chain: network,
      onWalletNotFound: createDefaultWalletNotFoundHandler(),
    });

    const phantom = new PhantomWalletAdapter();
    const solflare = new SolflareWalletAdapter();

    // Android Chrome: native wallet app via Mobile Wallet Adapter
    if (isAndroidChrome()) {
      return [mobileMwa, phantom, solflare];
    }

    // iOS Safari / mobile WebKit: injected provider inside Phantom in-app browser
    if (isMobileDevice()) {
      return hasInjectedSolanaProvider() ? [phantom, solflare] : [];
    }

    // Desktop
    return [mobileMwa, phantom, solflare];
  }, [network]);

  const autoConnect =
    typeof window !== "undefined"
    && !isInAppBrowser()
    && (hasInjectedSolanaProvider() || isAndroidChrome());

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={autoConnect}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
