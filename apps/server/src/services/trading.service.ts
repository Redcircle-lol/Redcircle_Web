import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import BN from 'bn.js';
import { db } from '../db';
import * as schema from '../db';
import { eq } from 'drizzle-orm';
import {
  estimateBuyTokensOut,
  estimateSellSolOut,
  calculateCurrentPrice,
  calculateMarketCap,
  parseCurveType,
  parsePoolStatus,
} from '@redcircle-lol/protocol-sdk';
import {
  getRedCircleClient,
  getAuthorityPublicKey,
  getTreasuryAddress,
  fetchRedCirclePool,
  REDCIRCLE_TOKEN_DECIMALS,
} from './redcircle.service.js';

// Legacy DBC imports — kept for backward-compat with pre-RedCircle posts
import {
  createBuyTransaction as dbcBuy,
  createSellTransaction as dbcSell,
  getBuyQuote as dbcBuyQuote,
  getSellQuote as dbcSellQuote,
  getDBCPoolPrice as dbcPoolPrice,
  getDBCPoolState as dbcPoolState,
} from './dbc.service.js';

const { posts } = schema;

// Default slippage tolerance: 100 bps = 1%
const DEFAULT_SLIPPAGE_BPS = 100;

// ─── Routing helpers ──────────────────────────────────────────────────────────

function isRedCirclePost(post: typeof schema.posts.$inferSelect): boolean {
  return !!post.redcirclePoolPda;
}

// Convert lamports/base-unit price (PRICE_PRECISION) → SOL per display token
// price = virtualSol * 10^9 / virtualToken  →  SOL/token = price / 10^12
function priceToSolPerToken(priceBN: BN): number {
  return priceBN.toNumber() / 1e12;
}

// ─── Buy ──────────────────────────────────────────────────────────────────────

interface BuyTokenParams {
  postId: string;            // DB UUID of the post
  buyerWalletAddress: string;
  amountInSOL: number;       // SOL to spend
  slippageBps?: number;
}

async function buyRedCircle(
  post: typeof schema.posts.$inferSelect,
  buyerWalletAddress: string,
  amountInSOL: number,
  slippageBps = DEFAULT_SLIPPAGE_BPS
) {
  const client = getRedCircleClient();
  const buyerPubkey = new PublicKey(buyerWalletAddress);
  const curator = getAuthorityPublicKey();
  const treasury = getTreasuryAddress();
  const solAmountLamports = new BN(Math.floor(amountInSOL * LAMPORTS_PER_SOL));

  // Fetch live pool to get current reserves for slippage calc
  const pool = await fetchRedCirclePool(post.redditPostId);
  if (!pool) {
    throw new Error(
      `RedCircle pool not found on-chain for post ${post.redditPostId}. ` +
      `Ensure the protocol is initialized and the pool was created.`
    );
  }

  const curveType = parseCurveType(pool.curveType);

  // Estimate tokens out, then apply slippage to get minimum acceptable
  const estimatedTokens = estimateBuyTokensOut(
    pool.virtualSolReserve,
    pool.virtualTokenReserve,
    solAmountLamports,
    curveType
  );
  const minTokensOut = estimatedTokens
    .muln(10000 - slippageBps)
    .divn(10000);

  // Build the buy instruction and assemble an unsigned versioned transaction
  const ix = await client.buy(buyerPubkey, post.redditPostId, treasury, curator, {
    solAmount: solAmountLamports,
    minTokensOut,
  });
  const tx = await client.buildTransaction(buyerPubkey, [ix]);
  const serialized = Buffer.from(tx.serialize()).toString('base64');

  const estimatedDisplayTokens = estimatedTokens.toNumber() / Math.pow(10, REDCIRCLE_TOKEN_DECIMALS);
  const pricePerToken = estimatedDisplayTokens > 0 ? amountInSOL / estimatedDisplayTokens : 0;

  console.log(`✅ RedCircle buy tx prepared`);
  console.log(`   SOL in      : ${amountInSOL}`);
  console.log(`   Est. tokens : ${estimatedDisplayTokens.toFixed(4)}`);

  return {
    success: true,
    transaction: serialized,
    quote: {
      amountInSOL,
      estimatedTokens: estimatedDisplayTokens,
      pricePerToken,
      slippageBps,
    },
  };
}

async function buyDBC(
  post: typeof schema.posts.$inferSelect,
  buyerWalletAddress: string,
  amountInSOL: number
) {
  if (!post.dbcPoolAddress) {
    throw new Error('No trading pool found for this post.');
  }
  const buyerPubkey = new PublicKey(buyerWalletAddress);
  const quote = await dbcBuyQuote(post.dbcPoolAddress, amountInSOL);
  const transaction = await dbcBuy(post.dbcPoolAddress, buyerPubkey, amountInSOL);

  const { blockhash } = await getRedCircleClient().connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyerPubkey;

  return {
    success: true,
    transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    quote: {
      amountInSOL,
      estimatedTokens: quote.baseAmount,
      pricePerToken: quote.pricePerToken,
    },
  };
}

export async function buyTokens(params: BuyTokenParams) {
  const { postId, buyerWalletAddress, amountInSOL, slippageBps } = params;

  console.log('\n💰 Processing buy...');
  console.log(`   Post UUID  : ${postId}`);
  console.log(`   Buyer      : ${buyerWalletAddress}`);
  console.log(`   SOL amount : ${amountInSOL}`);

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) throw new Error('Post not found');

  if (isRedCirclePost(post)) {
    return buyRedCircle(post, buyerWalletAddress, amountInSOL, slippageBps);
  }
  return buyDBC(post, buyerWalletAddress, amountInSOL);
}

// ─── Sell ─────────────────────────────────────────────────────────────────────

interface SellTokenParams {
  postId: string;            // DB UUID
  sellerWalletAddress: string;
  amount: number;            // Display token units (e.g. 100 = 100 tokens)
  slippageBps?: number;
}

async function sellRedCircle(
  post: typeof schema.posts.$inferSelect,
  sellerWalletAddress: string,
  amount: number,
  slippageBps = DEFAULT_SLIPPAGE_BPS
) {
  const client = getRedCircleClient();
  const sellerPubkey = new PublicKey(sellerWalletAddress);
  const curator = getAuthorityPublicKey();
  const treasury = getTreasuryAddress();

  // Convert display token amount → base units (6 decimals)
  const tokenAmountBaseUnits = new BN(
    Math.floor(amount * Math.pow(10, REDCIRCLE_TOKEN_DECIMALS))
  );

  const pool = await fetchRedCirclePool(post.redditPostId);
  if (!pool) {
    throw new Error(`RedCircle pool not found on-chain for post ${post.redditPostId}.`);
  }

  const curveType = parseCurveType(pool.curveType);

  // Estimate SOL out, then apply slippage
  const estimatedSolLamports = estimateSellSolOut(
    pool.virtualSolReserve,
    pool.virtualTokenReserve,
    tokenAmountBaseUnits,
    curveType
  );
  const minSolOut = estimatedSolLamports
    .muln(10000 - slippageBps)
    .divn(10000);

  const ix = await client.sell(sellerPubkey, post.redditPostId, treasury, curator, {
    tokenAmount: tokenAmountBaseUnits,
    minSolOut,
  });
  const tx = await client.buildTransaction(sellerPubkey, [ix]);
  const serialized = Buffer.from(tx.serialize()).toString('base64');

  const estimatedSolReturn = estimatedSolLamports.toNumber() / LAMPORTS_PER_SOL;
  const pricePerToken = amount > 0 ? estimatedSolReturn / amount : 0;

  console.log(`✅ RedCircle sell tx prepared`);
  console.log(`   Tokens in   : ${amount}`);
  console.log(`   Est. SOL out: ${estimatedSolReturn.toFixed(6)}`);

  return {
    success: true,
    transaction: serialized,
    quote: {
      amountInTokens: amount,
      estimatedReturn: estimatedSolReturn,
      pricePerToken,
      slippageBps,
    },
  };
}

async function sellDBC(
  post: typeof schema.posts.$inferSelect,
  sellerWalletAddress: string,
  amount: number
) {
  if (!post.dbcPoolAddress) {
    throw new Error('No trading pool found for this post.');
  }
  const sellerPubkey = new PublicKey(sellerWalletAddress);
  const tokenDecimals = post.tokenDecimals || 9;
  const quote = await dbcSellQuote(post.dbcPoolAddress, amount, tokenDecimals);
  const transaction = await dbcSell(post.dbcPoolAddress, sellerPubkey, amount, tokenDecimals);

  const { blockhash } = await getRedCircleClient().connection.getLatestBlockhash('finalized');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sellerPubkey;

  return {
    success: true,
    transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    quote: {
      amountInTokens: amount,
      estimatedReturn: quote.quoteAmount,
      pricePerToken: quote.pricePerToken,
    },
  };
}

export async function sellTokens(params: SellTokenParams) {
  const { postId, sellerWalletAddress, amount, slippageBps } = params;

  console.log('\n💸 Processing sell...');
  console.log(`   Post UUID  : ${postId}`);
  console.log(`   Seller     : ${sellerWalletAddress}`);
  console.log(`   Tokens     : ${amount}`);

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) throw new Error('Post not found');

  if (isRedCirclePost(post)) {
    return sellRedCircle(post, sellerWalletAddress, amount, slippageBps);
  }
  return sellDBC(post, sellerWalletAddress, amount);
}

// ─── Trading stats ────────────────────────────────────────────────────────────

async function getRedCircleStats(post: typeof schema.posts.$inferSelect) {
  const pool = await fetchRedCirclePool(post.redditPostId);

  // Fallback to DB values if pool account not found on current network
  if (!pool) {
    return {
      currentPrice: parseFloat(post.currentPrice),
      totalSupply: post.tokenSupply,
      soldSupply: 0,
      availableSupply: post.tokenSupply,
      totalVolume: parseFloat(post.totalVolume),
      marketCap: parseFloat(post.marketCap),
      holders: post.holders,
      poolStatus: 'unknown',
      poolStatusRaw: null,
      realSolReserve: 0,
      virtualSolReserve: 0,
      migrationProgress: 0,
    };
  }

  const curveType = parseCurveType(pool.curveType);
  const poolStatus = parsePoolStatus(pool.status);

  // Current price: SOL per display token
  const priceBN = calculateCurrentPrice(pool.virtualSolReserve, pool.virtualTokenReserve);
  const currentPrice = priceToSolPerToken(priceBN);

  // Market cap in SOL
  const marketCapLamports = calculateMarketCap(
    pool.virtualSolReserve,
    pool.virtualTokenReserve,
    pool.tokenSupply
  );
  const marketCap = marketCapLamports.toNumber() / LAMPORTS_PER_SOL;

  // Supply figures (display units)
  const tokenDecimals = REDCIRCLE_TOKEN_DECIMALS;
  const tokenDivisor = Math.pow(10, tokenDecimals);
  const totalSupply = pool.tokenSupply.toNumber() / tokenDivisor;
  const soldSupply = pool.tokensSold.toNumber() / tokenDivisor;
  const availableSupply = totalSupply - soldSupply;

  // Volume in SOL
  const totalVolume = pool.totalVolume.toNumber() / LAMPORTS_PER_SOL;

  // Real SOL in pool vault
  const realSolReserve = pool.realSolReserve.toNumber() / LAMPORTS_PER_SOL;
  const virtualSolReserve = pool.virtualSolReserve.toNumber() / LAMPORTS_PER_SOL;

  // Migration progress toward 85 SOL threshold
  const migrationThresholdSol = pool.migrationThreshold.toNumber() / LAMPORTS_PER_SOL;
  const migrationProgress =
    migrationThresholdSol > 0
      ? Math.min(100, (realSolReserve / migrationThresholdSol) * 100)
      : 0;

  // Buy price estimates for common amounts
  const getBuyPrice = (sol: number) => {
    const lamports = new BN(Math.floor(sol * LAMPORTS_PER_SOL));
    const tokensOut = estimateBuyTokensOut(
      pool.virtualSolReserve,
      pool.virtualTokenReserve,
      lamports,
      curveType
    );
    const displayTokens = tokensOut.toNumber() / tokenDivisor;
    return displayTokens > 0 ? sol / displayTokens : 0;
  };

  return {
    currentPrice,
    totalSupply,
    soldSupply,
    availableSupply,
    totalVolume,
    marketCap,
    holders: post.holders,
    poolStatus,
    realSolReserve,
    virtualSolReserve,
    migrationThresholdSol,
    migrationProgress,
    unclaimedCuratorFees: pool.unclaimedCuratorFees.toNumber() / LAMPORTS_PER_SOL,
    unclaimedCreatorFees: pool.unclaimedCreatorFees.toNumber() / LAMPORTS_PER_SOL,
    buyPrice1: getBuyPrice(0.001),
    buyPrice10: getBuyPrice(0.01),
    buyPrice100: getBuyPrice(0.1),
    poolBaseReserves: availableSupply,
    poolQuoteReserves: realSolReserve,
  };
}

async function getDBCStats(post: typeof schema.posts.$inferSelect) {
  if (!post.dbcPoolAddress) {
    return {
      currentPrice: parseFloat(post.currentPrice),
      totalSupply: post.tokenSupply,
      soldSupply: 0,
      availableSupply: post.tokenSupply,
      totalVolume: parseFloat(post.totalVolume),
      marketCap: parseFloat(post.marketCap),
      holders: post.holders,
      buyPrice1: parseFloat(post.currentPrice),
      buyPrice10: parseFloat(post.currentPrice) * 10,
      buyPrice100: parseFloat(post.currentPrice) * 100,
    };
  }

  const currentPrice = await dbcPoolPrice(post.dbcPoolAddress);
  const poolState = await dbcPoolState(post.dbcPoolAddress);

  let baseReserves = 0;
  let quoteReserves = 0;
  if (poolState) {
    baseReserves = poolState.baseReserves.toNumber() / Math.pow(10, post.tokenDecimals || 9);
    quoteReserves = poolState.quoteReserves.toNumber() / 1e9;
  }

  const quote1 = await dbcBuyQuote(post.dbcPoolAddress, 0.001);
  const quote10 = await dbcBuyQuote(post.dbcPoolAddress, 0.01);
  const quote100 = await dbcBuyQuote(post.dbcPoolAddress, 0.1);

  return {
    currentPrice,
    totalSupply: post.tokenSupply,
    soldSupply: post.tokenSupply - baseReserves,
    availableSupply: baseReserves,
    totalVolume: parseFloat(post.totalVolume),
    marketCap: currentPrice * post.tokenSupply,
    holders: post.holders,
    buyPrice1: quote1.pricePerToken,
    buyPrice10: quote10.pricePerToken,
    buyPrice100: quote100.pricePerToken,
    poolBaseReserves: baseReserves,
    poolQuoteReserves: quoteReserves,
  };
}

export async function getTradingStats(postId: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) throw new Error('Post not found');

  if (isRedCirclePost(post)) {
    return getRedCircleStats(post);
  }
  return getDBCStats(post);
}
