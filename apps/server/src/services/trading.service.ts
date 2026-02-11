import { 
  Connection, 
  PublicKey,
} from '@solana/web3.js';
import { db } from '../db';
import * as schema from '../db';
import { eq } from 'drizzle-orm';
import {
  createBuyTransaction,
  createSellTransaction,
  getBuyQuote,
  getSellQuote,
  getDBCPoolPrice,
} from './dbc.service.js';

const { posts } = schema;

/**
 * Trading Service for buying/selling tokens with Meteora DBC
 * This is now fully decentralized - users interact directly with on-chain pools
 */

interface BuyTokenParams {
  postId: string;
  buyerWalletAddress: string;
  amountInSOL: number; // Amount of SOL to spend
}

/**
 * Buy tokens from a DBC pool
 * Returns a transaction that the user must sign with their wallet
 */
export async function buyTokens(params: BuyTokenParams) {
  const { postId, buyerWalletAddress, amountInSOL } = params;
  
  console.log('\n💰 Processing token purchase...');
  console.log(`   Post ID: ${postId}`);
  console.log(`   Buyer: ${buyerWalletAddress}`);
  console.log(`   Amount: ${amountInSOL} SOL`);

  try {
    // 1. Get post details
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      throw new Error('Post not found');
    }

    if (!post.dbcPoolAddress) {
      throw new Error('DBC pool not created for this post. Please contact support.');
    }

    // 2. Get buy quote
    const quote = await getBuyQuote(post.dbcPoolAddress, amountInSOL);
    console.log(`   Estimated tokens: ${quote.baseAmount.toFixed(6)}`);
    console.log(`   Price per token: ${quote.pricePerToken.toFixed(9)} SOL`);

    // 3. Create buyer public key
    const buyerPubkey = new PublicKey(buyerWalletAddress);

    // 4. Create buy transaction
    const transaction = await createBuyTransaction(
      post.dbcPoolAddress,
      buyerPubkey,
      amountInSOL
    );

    // 5. Get recent blockhash
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = buyerPubkey;

    // 6. Serialize transaction for client to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    console.log('✅ Buy transaction prepared successfully');

    return {
      success: true,
      transaction: serializedTransaction,
      quote: {
        amountInSOL,
        estimatedTokens: quote.baseAmount,
        pricePerToken: quote.pricePerToken,
      },
    };
  } catch (error) {
    console.error('❌ Buy tokens error:', error);
    throw error;
  }
}

interface SellTokenParams {
  postId: string;
  sellerWalletAddress: string;
  amountInTokens: number; // Amount of tokens to sell
}

/**
 * Sell tokens back to the DBC pool
 * Returns a transaction that the user must sign with their wallet
 */
export async function sellTokens(params: SellTokenParams) {
  const { postId, sellerWalletAddress, amountInTokens } = params;
  
  console.log('\n💸 Processing token sale...');
  console.log(`   Post ID: ${postId}`);
  console.log(`   Seller: ${sellerWalletAddress}`);
  console.log(`   Amount: ${amountInTokens} tokens`);

  try {
    // 1. Get post details
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      throw new Error('Post not found');
    }

    if (!post.dbcPoolAddress) {
      throw new Error('DBC pool not created for this post. Please contact support.');
    }

    // 2. Get sell quote
    const quote = await getSellQuote(
      post.dbcPoolAddress,
      amountInTokens,
      post.tokenDecimals || 9
    );
    console.log(`   Estimated return: ${quote.quoteAmount.toFixed(6)} SOL`);
    console.log(`   Price per token: ${quote.pricePerToken.toFixed(9)} SOL`);

    // 3. Create seller public key
    const sellerPubkey = new PublicKey(sellerWalletAddress);

    // 4. Create sell transaction
    const transaction = await createSellTransaction(
      post.dbcPoolAddress,
      sellerPubkey,
      amountInTokens,
      post.tokenDecimals || 9
    );

    // 5. Get recent blockhash
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sellerPubkey;

    // 6. Serialize transaction for client to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    console.log('✅ Sell transaction prepared successfully');

    return {
      success: true,
      transaction: serializedTransaction,
      quote: {
        amountInTokens,
        estimatedReturn: quote.quoteAmount,
        pricePerToken: quote.pricePerToken,
      },
    };
  } catch (error) {
    console.error('❌ Sell tokens error:', error);
    throw error;
  }
}

/**
 * Get trading stats for a post
 * Fetches real-time data from the DBC pool
 */
export async function getTradingStats(postId: string) {
  try {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      throw new Error('Post not found');
    }

    if (!post.dbcPoolAddress) {
      // Fallback to database values if pool not created yet
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

    // Get real-time price from DBC pool
    const currentPrice = await getDBCPoolPrice(post.dbcPoolAddress);
    
    // Get pool state for more detailed stats
    const { getDBCPoolState } = await import('./dbc.service.js');
    const poolState = await getDBCPoolState(post.dbcPoolAddress);
    
    let baseReserves = 0;
    let quoteReserves = 0;
    if (poolState) {
      baseReserves = poolState.baseReserves.toNumber() / Math.pow(10, post.tokenDecimals || 9);
      quoteReserves = poolState.quoteReserves.toNumber() / 1e9; // SOL has 9 decimals
    }

    // Calculate market cap from current price
    const marketCap = currentPrice * post.tokenSupply;

    // Get quotes for different buy amounts
    const quote1 = await getBuyQuote(post.dbcPoolAddress, 0.001); // ~0.001 SOL
    const quote10 = await getBuyQuote(post.dbcPoolAddress, 0.01); // ~0.01 SOL
    const quote100 = await getBuyQuote(post.dbcPoolAddress, 0.1); // ~0.1 SOL

    return {
      currentPrice,
      totalSupply: post.tokenSupply,
      soldSupply: post.tokenSupply - baseReserves, // Tokens sold = total - remaining in pool
      availableSupply: baseReserves,
      totalVolume: parseFloat(post.totalVolume),
      marketCap,
      holders: post.holders,
      // Price for buying with different SOL amounts
      buyPrice1: quote1.pricePerToken,
      buyPrice10: quote10.pricePerToken,
      buyPrice100: quote100.pricePerToken,
      // Pool reserves
      poolBaseReserves: baseReserves,
      poolQuoteReserves: quoteReserves,
    };
  } catch (error) {
    console.error('❌ Get trading stats error:', error);
    throw error;
  }
}
