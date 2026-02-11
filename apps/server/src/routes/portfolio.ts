import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { db } from "../db";
import * as schema from "../db";
import { eq } from "drizzle-orm";

const { holdings, posts } = schema;

const router = Router();

/**
 * GET /api/portfolio
 * Get current user's portfolio (all holdings)
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    console.log(`\n📊 Fetching portfolio for user: ${userId}`);

    // Get all holdings for user with post details
    const userHoldings = await db
      .select({
        holding: holdings,
        post: posts,
      })
      .from(holdings)
      .leftJoin(posts, eq(holdings.postId, posts.id))
      .where(eq(holdings.userId, userId));

    console.log(`✅ Found ${userHoldings.length} holdings`);

    // Calculate portfolio stats
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalRealized = 0;

    const portfolio = userHoldings.map(({ holding, post }) => {
      const invested = parseFloat(holding.totalInvested);
      const realized = parseFloat(holding.totalRealized);
      const currentPrice = post ? parseFloat(post.currentPrice) : 0;
      const currentValue = holding.amount * currentPrice;
      const unrealizedPnL = currentValue - invested;
      const unrealizedPnLPercent = invested > 0 ? (unrealizedPnL / invested) * 100 : 0;

      totalInvested += invested;
      totalCurrentValue += currentValue;
      totalRealized += realized;

      return {
        holdingId: holding.id,
        postId: holding.postId,
        tokenMintAddress: holding.tokenMintAddress,
        amount: holding.amount,
        averageBuyPrice: parseFloat(holding.averageBuyPrice),
        totalInvested: invested,
        totalRealized: realized,
        currentPrice,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        post: post ? {
          id: post.id,
          title: post.title,
          subreddit: post.subreddit,
          author: post.author,
          tokenSymbol: post.tokenSymbol,
          thumbnail: post.thumbnail,
          upvotes: post.upvotes,
          comments: post.comments,
        } : null,
      };
    });

    const totalPnL = totalCurrentValue - totalInvested + totalRealized;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    res.json({
      success: true,
      portfolio,
      stats: {
        totalInvested,
        totalCurrentValue,
        totalRealized,
        totalPnL,
        totalPnLPercent,
        holdingsCount: portfolio.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Portfolio error:", error);
    res.status(500).json({
      error: "Failed to fetch portfolio",
      details: error.message,
    });
  }
});

/**
 * GET /api/portfolio/stats
 * Get user's portfolio summary stats only
 */
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const userHoldings = await db
      .select({
        holding: holdings,
        post: posts,
      })
      .from(holdings)
      .leftJoin(posts, eq(holdings.postId, posts.id))
      .where(eq(holdings.userId, userId));

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalRealized = 0;

    userHoldings.forEach(({ holding, post }) => {
      const invested = parseFloat(holding.totalInvested);
      const realized = parseFloat(holding.totalRealized);
      const currentPrice = post ? parseFloat(post.currentPrice) : 0;
      const currentValue = holding.amount * currentPrice;

      totalInvested += invested;
      totalCurrentValue += currentValue;
      totalRealized += realized;
    });

    const totalPnL = totalCurrentValue - totalInvested + totalRealized;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    res.json({
      success: true,
      stats: {
        totalInvested,
        totalCurrentValue,
        totalRealized,
        totalPnL,
        totalPnLPercent,
        holdingsCount: userHoldings.length,
      },
    });
  } catch (error: any) {
    console.error("❌ Portfolio stats error:", error);
    res.status(500).json({
      error: "Failed to fetch portfolio stats",
      details: error.message,
    });
  }
});

export default router;


