import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { db } from "../db";
import * as schema from "../db";
import { eq, desc, and, sql } from "drizzle-orm";

const { transactions, posts } = schema;
const router = Router();

/**
 * GET /api/transactions
 * Get user's transaction history
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { limit = 50, offset = 0, type } = req.query;

    let query = db
      .select({
        // Transaction fields
        transactionId: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        pricePerToken: transactions.pricePerToken,
        totalValue: transactions.totalValue,
        signature: transactions.signature,
        tokenMintAddress: transactions.tokenMintAddress,
        walletAddress: transactions.walletAddress,
        networkFee: transactions.networkFee,
        platformFee: transactions.platformFee,
        status: transactions.status,
        createdAt: transactions.createdAt,
        // Post fields
        postId: posts.id,
        postTitle: posts.title,
        postSubreddit: posts.subreddit,
        postThumbnail: posts.thumbnail,
        postTokenSymbol: posts.tokenSymbol,
      })
      .from(transactions)
      .leftJoin(posts, eq(transactions.postId, posts.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Filter by type if specified
    if (type && (type === 'buy' || type === 'sell')) {
      query = query.where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, type as string)
        )
      ) as any;
    }

    const userTransactions = await query;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    res.json({
      success: true,
      transactions: userTransactions,
      pagination: {
        total: countResult?.count || 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: (parseInt(offset as string) + userTransactions.length) < (countResult?.count || 0),
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching transactions:", error);
    res.status(500).json({
      error: "Failed to fetch transactions",
      details: error.message,
    });
  }
});

/**
 * GET /api/transactions/stats
 * Get transaction statistics for user
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const [stats] = await db
      .select({
        totalTransactions: sql<number>`count(${transactions.id})`.as('totalTransactions'),
        totalBuys: sql<number>`count(case when ${transactions.type} = 'buy' then 1 end)`.as('totalBuys'),
        totalSells: sql<number>`count(case when ${transactions.type} = 'sell' then 1 end)`.as('totalSells'),
        totalVolume: sql<string>`sum(${transactions.totalValue})`.as('totalVolume'),
        totalBuyVolume: sql<string>`sum(case when ${transactions.type} = 'buy' then ${transactions.totalValue} else 0 end)`.as('totalBuyVolume'),
        totalSellVolume: sql<string>`sum(case when ${transactions.type} = 'sell' then ${transactions.totalValue} else 0 end)`.as('totalSellVolume'),
        totalFees: sql<string>`sum(${transactions.networkFee} + ${transactions.platformFee})`.as('totalFees'),
      })
      .from(transactions)
      .where(eq(transactions.userId, userId));

    res.json({
      success: true,
      stats: {
        totalTransactions: stats?.totalTransactions || 0,
        totalBuys: stats?.totalBuys || 0,
        totalSells: stats?.totalSells || 0,
        totalVolume: parseFloat(stats?.totalVolume || "0").toFixed(9),
        totalBuyVolume: parseFloat(stats?.totalBuyVolume || "0").toFixed(9),
        totalSellVolume: parseFloat(stats?.totalSellVolume || "0").toFixed(9),
        totalFees: parseFloat(stats?.totalFees || "0").toFixed(9),
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching transaction stats:", error);
    res.status(500).json({
      error: "Failed to fetch transaction stats",
      details: error.message,
    });
  }
});

/**
 * GET /api/transactions/:id
 * Get single transaction details
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const [transaction] = await db
      .select({
        // Transaction fields
        transactionId: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        pricePerToken: transactions.pricePerToken,
        totalValue: transactions.totalValue,
        signature: transactions.signature,
        tokenMintAddress: transactions.tokenMintAddress,
        walletAddress: transactions.walletAddress,
        networkFee: transactions.networkFee,
        platformFee: transactions.platformFee,
        status: transactions.status,
        createdAt: transactions.createdAt,
        // Post fields
        postId: posts.id,
        postTitle: posts.title,
        postSubreddit: posts.subreddit,
        postThumbnail: posts.thumbnail,
        postTokenSymbol: posts.tokenSymbol,
        postCurrentPrice: posts.currentPrice,
      })
      .from(transactions)
      .leftJoin(posts, eq(transactions.postId, posts.id))
      .where(
        and(
          eq(transactions.id, id),
          eq(transactions.userId, userId)
        )
      )
      .limit(1);

    if (!transaction) {
      return res.status(404).json({
        error: "Transaction not found",
      });
    }

    res.json({
      success: true,
      transaction,
    });
  } catch (error: any) {
    console.error("❌ Error fetching transaction:", error);
    res.status(500).json({
      error: "Failed to fetch transaction",
      details: error.message,
    });
  }
});

export default router;


