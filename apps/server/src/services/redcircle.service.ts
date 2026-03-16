import * as anchor from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RedCircleClient } from '@redcircle-lol/protocol-sdk';
import bs58 from 'bs58';

// Protocol constants — mirrors redcircle-protocol/sdk/src/constants.ts
export const REDCIRCLE_TOKEN_DECIMALS = 6;
export const REDCIRCLE_TOKEN_SUPPLY = 1_000_000_000; // 1 billion tokens

// Initial price derived from default virtual reserves:
// price = (30 SOL) / (1B tokens) = 3e-8 SOL per token
export const REDCIRCLE_INITIAL_PRICE =
  30 / REDCIRCLE_TOKEN_SUPPLY;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRpcUrl(): string {
  if (!process.env.SOLANA_RPC_URL && process.env.NODE_ENV === 'production') {
    throw new Error('SOLANA_RPC_URL must be set in production');
  }
  return process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
}

function getAuthorityKeypair(): Keypair {
  const privateKey = process.env.SOLANA_AUTHORITY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      'SOLANA_AUTHORITY_PRIVATE_KEY not set. ' +
      'Generate with: solana-keygen new'
    );
  }
  try {
    return Keypair.fromSecretKey(bs58.decode(privateKey));
  } catch {
    throw new Error('Invalid SOLANA_AUTHORITY_PRIVATE_KEY — must be base58 encoded.');
  }
}

function getTreasuryAddress(): PublicKey {
  const addr = process.env.REDCIRCLE_TREASURY_ADDRESS;
  if (addr) return new PublicKey(addr);
  // Fall back to the authority wallet itself for development
  return getAuthorityKeypair().publicKey;
}

// ─── Singleton client ─────────────────────────────────────────────────────────

let _client: RedCircleClient | null = null;

/** Call after changing env vars in tests to get a fresh client. */
export function resetRedCircleClient() {
  _client = null;
}

export function getRedCircleClient(): RedCircleClient {
  if (_client) return _client;

  const connection = new Connection(getRpcUrl(), 'confirmed');
  const keypair = getAuthorityKeypair();
  const wallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });

  // Override program ID via env so localnet and devnet both work without code changes
  const programIdEnv = process.env.REDCIRCLE_PROGRAM_ID;
  const opts = programIdEnv ? { programId: new PublicKey(programIdEnv) } : undefined;

  _client = new RedCircleClient(provider, opts);
  return _client;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateRedCirclePoolParams {
  postId: string;     // Reddit post ID — used as PDA seed (max 32 chars)
  name: string;       // On-chain token name
  symbol: string;     // On-chain token symbol
  uri?: string;       // Metadata URI (IPFS/Arweave — can be empty initially)
}

export interface CreateRedCirclePoolResult {
  poolPda: string;
  tokenMint: string;
  poolSolVault: string;
  transactionSignature: string;
  tokenDecimals: number;
  tokenSupply: number;
  initialPrice: number;
  explorerUrl: string;
}

// ─── Pool creation ────────────────────────────────────────────────────────────

/**
 * Tokenizes a Reddit post using the RedCircle Protocol.
 *
 * Calls the on-chain `create_pool` instruction which:
 *  1. Creates the Pool PDA
 *  2. Creates the token mint (PDA-derived — no separate `createMint` needed)
 *  3. Mints 1 billion RPT tokens (6 decimals) into the pool vault
 *
 * The server's authority keypair acts as the curator and pays the tx fee.
 */
export async function createRedCirclePool(
  params: CreateRedCirclePoolParams
): Promise<CreateRedCirclePoolResult> {
  const client = getRedCircleClient();
  const curator = getAuthorityKeypair();
  const treasury = getTreasuryAddress();

  console.log('\n🔵 Creating RedCircle pool...');
  console.log(`   Post ID  : ${params.postId}`);
  console.log(`   Name     : ${params.name}`);
  console.log(`   Symbol   : ${params.symbol}`);
  console.log(`   Curator  : ${curator.publicKey.toBase58()}`);
  console.log(`   Treasury : ${treasury.toBase58()}`);

  // Validate postId length (protocol enforces ≤ 32 chars)
  if (params.postId.length > 32) {
    throw new Error(
      `Post ID "${params.postId}" is ${params.postId.length} chars — protocol limit is 32.`
    );
  }

  // Check curator balance
  const balance = await client.connection.getBalance(curator.publicKey);
  console.log(`   Balance  : ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    throw new Error(
      `Insufficient balance (${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL). ` +
      `Need at least 0.05 SOL. ` +
      `For devnet: solana airdrop 2 ${curator.publicKey.toBase58()} --url devnet`
    );
  }

  // Derive all pool addresses deterministically from the postId
  const addrs = client.derivePoolAddresses(params.postId);
  console.log(`   Pool PDA : ${addrs.pool.toBase58()}`);
  console.log(`   Token    : ${addrs.tokenMint.toBase58()}`);

  // Build the create_pool instruction
  const ix = await client.createPool(curator.publicKey, treasury, {
    postId: params.postId,
    name: params.name,
    symbol: params.symbol,
    uri: params.uri ?? '',
  });

  // Assemble a versioned transaction, sign with curator, and submit
  const tx = await client.buildTransaction(curator.publicKey, [ix]);
  tx.sign([curator]);

  const sig = await client.connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  await client.connection.confirmTransaction(sig, 'confirmed');

  console.log(`✅ RedCircle pool created!`);
  console.log(`   Signature: ${sig}`);

  const network = getRpcUrl().includes('devnet') ? 'devnet' : 'mainnet';

  return {
    poolPda: addrs.pool.toBase58(),
    tokenMint: addrs.tokenMint.toBase58(),
    poolSolVault: addrs.poolSolVault.toBase58(),
    transactionSignature: sig,
    tokenDecimals: REDCIRCLE_TOKEN_DECIMALS,
    tokenSupply: REDCIRCLE_TOKEN_SUPPLY,
    initialPrice: REDCIRCLE_INITIAL_PRICE,
    explorerUrl: `https://solscan.io/tx/${sig}?cluster=${network}`,
  };
}

/**
 * Fetch the on-chain Pool account for a given Reddit post ID.
 * Useful for reading live reserves, status, and fee data.
 */
export async function fetchRedCirclePool(postId: string) {
  const client = getRedCircleClient();
  try {
    return await client.fetchPool(postId);
  } catch {
    return null;
  }
}

/**
 * Returns the server authority wallet's public key.
 * Used by trading service as the curator for all RedCircle pools.
 */
export function getAuthorityPublicKey() {
  return getAuthorityKeypair().publicKey;
}

/**
 * Re-export so trading service can read the treasury address.
 */
export { getTreasuryAddress };
