import { Router } from 'express';
import { PublicKey } from '@solana/web3.js';
import { db } from '../db';
import * as schema from '../db';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import {
  getRedCircleClient,
  getAuthorityPublicKey,
  fetchRedCirclePool,
} from '../services/redcircle.service.js';

const { posts, users } = schema;
const router: ReturnType<typeof Router> = Router();

// ─── POST /api/protocol/set-creator ──────────────────────────────────────────
// Links the post author's connected wallet as the on-chain creator for their pool.
// The server authority (curator) must sign the setCreator instruction.
// Body: { postId: string, walletAddress: string }
// Auth: user must be logged in (their Reddit username must match post.author)
router.post('/set-creator', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { postId, walletAddress } = req.body;

    if (!postId || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields: postId, walletAddress' });
    }

    // Validate wallet address format
    let creatorPubkey: PublicKey;
    try {
      creatorPubkey = new PublicKey(walletAddress);
    } catch {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Fetch the post
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.redcirclePoolPda) return res.status(400).json({ error: 'Post has no RedCircle pool' });

    // Verify caller is the post author
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.username !== post.author) {
      return res.status(403).json({ error: 'Only the original post author can register as creator' });
    }

    // Check pool on-chain: if creator is already set and not the default, bail early
    const pool = await fetchRedCirclePool(post.redditPostId);
    if (!pool) return res.status(503).json({ error: 'Pool not found on-chain. Ensure localnet/devnet is running.' });

    const NULL_PUBKEY = '11111111111111111111111111111111';
    const existingCreator = pool.creator.toBase58();
    if (existingCreator !== NULL_PUBKEY && existingCreator !== creatorPubkey.toBase58()) {
      return res.status(409).json({
        error: 'A different creator is already registered for this pool',
        existingCreator,
      });
    }
    if (existingCreator !== NULL_PUBKEY && existingCreator === creatorPubkey.toBase58()) {
      return res.json({ success: true, message: 'Already registered as creator', alreadySet: true });
    }

    // Build, sign, and submit the setCreator instruction (server authority signs)
    const client = getRedCircleClient();
    const authority = getAuthorityPublicKey();

    const ix = await client.setCreator(authority, post.redditPostId, creatorPubkey);

    const tx = await client.buildTransaction(authority, [ix]);

    // Server keypair signs
    const { Keypair } = await import('@solana/web3.js');
    const bs58 = (await import('bs58')).default;
    const secretKeyStr = process.env.REDCIRCLE_AUTHORITY_KEYPAIR;
    if (!secretKeyStr) throw new Error('REDCIRCLE_AUTHORITY_KEYPAIR not set');
    const secretKey = bs58.decode(secretKeyStr);
    const authorityKeypair = Keypair.fromSecretKey(secretKey);
    tx.sign([authorityKeypair]);

    const signature = await client.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    await client.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Creator registered: post=${postId} creator=${walletAddress} sig=${signature}`);
    res.json({ success: true, signature, creatorWallet: walletAddress });
  } catch (error: any) {
    console.error('❌ set-creator error:', error);
    res.status(500).json({ error: 'Failed to register creator', details: error.message });
  }
});

// ─── GET /api/protocol/creator-status/:postId ─────────────────────────────────
// Returns whether the caller's wallet is the registered on-chain creator.
// Query param: ?walletAddress=<base58>
router.get('/creator-status/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { walletAddress } = req.query as { walletAddress?: string };

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post || !post.redcirclePoolPda) {
      return res.json({ isCreator: false, creatorRegistered: false });
    }

    const pool = await fetchRedCirclePool(post.redditPostId);
    if (!pool) return res.json({ isCreator: false, creatorRegistered: false, poolOffline: true });

    const creatorOnChain = pool.creator.toBase58();
    const NULL_PUBKEY = '11111111111111111111111111111111';
    const creatorRegistered = creatorOnChain !== NULL_PUBKEY;
    const isCreator = !!walletAddress && creatorOnChain === walletAddress;
    const unclaimedFees = pool.unclaimedCreatorFees.toNumber() / 1_000_000_000;

    res.json({ isCreator, creatorRegistered, creatorWallet: creatorOnChain, unclaimedFees });
  } catch (error: any) {
    console.error('❌ creator-status error:', error);
    res.status(500).json({ error: 'Failed to check creator status', details: error.message });
  }
});

// ─── POST /api/protocol/claim-curator-fees/:postId ───────────────────────────
// Admin endpoint: server authority claims accumulated curator fees for a pool.
// No user auth needed — this is server-signed and benefits the platform wallet.
router.post('/claim-curator-fees/:postId', async (req, res) => {
  try {
    // Rudimentary admin guard — check internal API secret header
    const adminSecret = req.headers['x-admin-secret'];
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { postId } = req.params;
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post || !post.redcirclePoolPda) {
      return res.status(404).json({ error: 'Post or pool not found' });
    }

    const pool = await fetchRedCirclePool(post.redditPostId);
    if (!pool) return res.status(503).json({ error: 'Pool not found on-chain' });

    const unclaimedSol = pool.unclaimedCuratorFees.toNumber() / 1_000_000_000;
    if (unclaimedSol < 0.000001) {
      return res.json({ success: true, message: 'No fees to claim', unclaimedSol });
    }

    const client = getRedCircleClient();
    const curator = getAuthorityPublicKey();

    const ix = await client.claimCuratorFees(curator, post.redditPostId);
    const tx = await client.buildTransaction(curator, [ix]);

    const { Keypair } = await import('@solana/web3.js');
    const bs58 = (await import('bs58')).default;
    const secretKey = bs58.decode(process.env.REDCIRCLE_AUTHORITY_KEYPAIR!);
    const authorityKeypair = Keypair.fromSecretKey(secretKey);
    tx.sign([authorityKeypair]);

    const signature = await client.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
    });
    await client.connection.confirmTransaction(signature, 'confirmed');

    console.log(`✅ Curator fees claimed: ${unclaimedSol} SOL — sig=${signature}`);
    res.json({ success: true, signature, claimedSol: unclaimedSol });
  } catch (error: any) {
    console.error('❌ claim-curator-fees error:', error);
    res.status(500).json({ error: 'Failed to claim curator fees', details: error.message });
  }
});

export default router;
