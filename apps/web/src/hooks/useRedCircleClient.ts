import { useMemo } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { RedCircleClient } from '@redcircle-lol/protocol-sdk';

/**
 * Returns a RedCircleClient backed by the user's connected wallet.
 * Returns null when no wallet is connected.
 *
 * The client can build instructions, fetch on-chain accounts, and estimate
 * curve output. Transactions still need to be signed+sent via sendTransaction
 * from useWallet().
 */
export function useRedCircleClient(): RedCircleClient | null {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  return useMemo(() => {
    if (!wallet) return null;

    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
      skipPreflight: false,
    });

    const programIdEnv = import.meta.env.VITE_REDCIRCLE_PROGRAM_ID;
    const programId = programIdEnv ? new PublicKey(programIdEnv) : undefined;

    return new RedCircleClient(provider, programId ? { programId } : undefined);
  }, [wallet, connection]);
}

/**
 * Build a read-only RedCircleClient for a given public key (no wallet needed).
 * Useful for instruction building when you have the payer pubkey but haven't
 * connected the wallet adapter yet.
 */
export function buildReadOnlyClient(
  connection: anchor.web3.Connection,
  payer: PublicKey
): RedCircleClient {
  const mockWallet = {
    publicKey: payer,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };
  const provider = new anchor.AnchorProvider(connection, mockWallet as any, {
    commitment: 'confirmed',
    skipPreflight: true,
  });
  const programIdEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as any).env?.VITE_REDCIRCLE_PROGRAM_ID
      : undefined;
  const programId = programIdEnv ? new PublicKey(programIdEnv) : undefined;
  return new RedCircleClient(provider, programId ? { programId } : undefined);
}
