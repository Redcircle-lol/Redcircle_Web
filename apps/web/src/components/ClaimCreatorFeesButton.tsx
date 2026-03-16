import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Coins, UserCheck, Loader2 } from 'lucide-react';
import { useRedCircleClient } from '@/hooks/useRedCircleClient';
import { fetchWithAuth } from '@/lib/auth';
import { formatSol } from '@/lib/redcircle';
import { Buffer } from 'buffer';

// @ts-ignore
window.Buffer = Buffer;

interface ClaimCreatorFeesButtonProps {
  postId: string;            // DB UUID
  redditPostId: string;      // Reddit post ID (PDA seed)
  postAuthor: string;        // Reddit username of the post author
  currentUsername?: string;  // Logged-in user's Reddit username
  unclaimedFees?: number;    // From trading stats (SOL)
  creatorWallet?: string;    // On-chain creator wallet (from trading stats)
}

type Status = 'idle' | 'loading' | 'registering' | 'claiming';

export default function ClaimCreatorFeesButton({
  postId,
  redditPostId,
  postAuthor,
  currentUsername,
  unclaimedFees = 0,
  creatorWallet,
}: ClaimCreatorFeesButtonProps) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const client = useRedCircleClient();
  const [status, setStatus] = useState<Status>('idle');
  const [onChainStatus, setOnChainStatus] = useState<{
    isCreator: boolean;
    creatorRegistered: boolean;
    unclaimedFees: number;
  } | null>(null);

  // Only show for the post author
  const isAuthor = !!currentUsername && currentUsername === postAuthor;
  const walletMatches = !!publicKey && creatorWallet === publicKey.toBase58();

  // Fetch authoritative creator status from server
  useEffect(() => {
    if (!isAuthor || !publicKey) return;
    fetchWithAuth(
      `/api/protocol/creator-status/${postId}?walletAddress=${publicKey.toBase58()}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setOnChainStatus(d);
      })
      .catch(() => {});
  }, [isAuthor, postId, publicKey]);

  if (!isAuthor) return null;
  if (!connected || !publicKey) {
    return (
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3 text-xs text-purple-300">
        Connect your wallet to claim creator fees for this post.
      </div>
    );
  }

  const fees = onChainStatus?.unclaimedFees ?? unclaimedFees;
  const creatorRegistered = onChainStatus?.creatorRegistered ?? !!creatorWallet;
  const isThisWalletCreator = onChainStatus?.isCreator ?? walletMatches;

  // ─── Register as creator ──────────────────────────────────────────────────
  const handleRegister = async () => {
    setStatus('registering');
    try {
      const res = await fetchWithAuth('/api/protocol/set-creator', {
        method: 'POST',
        body: JSON.stringify({ postId, walletAddress: publicKey.toBase58() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Registration failed');

      toast.success('Registered as creator!', {
        description: "You can now claim your share of trading fees.",
      });
      setOnChainStatus({ isCreator: true, creatorRegistered: true, unclaimedFees: fees });
    } catch (err) {
      toast.error('Registration failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setStatus('idle');
    }
  };

  // ─── Claim fees ───────────────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!client || !sendTransaction) {
      toast.error('Wallet not ready');
      return;
    }
    setStatus('claiming');
    try {
      const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');

      const ix = await client.claimCreatorFees(publicKey, redditPostId);
      const tx = await client.buildTransaction(publicKey, [ix]);

      const signature = await sendTransaction(tx as any, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        'confirmed'
      );
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      toast.success(`Claimed ${formatSol(fees)} SOL!`, {
        description: 'Creator fees sent to your wallet.',
        action: {
          label: 'Solscan',
          onClick: () =>
            window.open(
              `https://solscan.io/tx/${signature}?cluster=devnet`,
              '_blank',
              'noopener,noreferrer'
            ),
        },
      });
      setOnChainStatus((prev) => prev ? { ...prev, unclaimedFees: 0 } : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.error('Claim failed', {
        description: msg.includes('User rejected') ? 'Transaction was cancelled.' : msg,
      });
    } finally {
      setStatus('idle');
    }
  };

  const isLoading = status !== 'idle';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-blue-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-4 w-4 text-purple-400" />
        <span className="text-sm font-semibold text-purple-300">Creator Fees</span>
      </div>

      {!creatorRegistered ? (
        <>
          <p className="mb-3 text-xs text-white/60">
            You&apos;re the author of this post. Register your wallet on-chain to start earning
            0.5% of every trade.
          </p>
          <Button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-sm font-semibold text-white hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registering…</>
            ) : (
              <><UserCheck className="mr-2 h-4 w-4" /> Register as Creator</>
            )}
          </Button>
        </>
      ) : !isThisWalletCreator ? (
        <p className="text-xs text-yellow-400">
          A different wallet is registered as creator for this pool. Switch to the correct wallet to
          claim fees.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-white/60">Unclaimed fees</span>
            <span className="text-sm font-bold text-white">{formatSol(fees)} SOL</span>
          </div>
          <Button
            onClick={handleClaim}
            disabled={isLoading || fees < 0.000001}
            className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-sm font-semibold text-white hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
          >
            {isLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Claiming…</>
            ) : fees < 0.000001 ? (
              'No fees to claim yet'
            ) : (
              <>Claim {formatSol(fees)} SOL</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
