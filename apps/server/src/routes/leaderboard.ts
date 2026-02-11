import { Router } from "express";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "../db";

const { users, posts, transactions } = schema;

const router = Router();

/**
 * GET /api/leaderboard
 * Get leaderboard data for authors and curators
 * Query params:
 *   - category: "author" | "curator" (default: "author")
 *   - limit: number (default: 10)
 */
router.get("/", async (req, res) => {
  try {
    const category = (req.query.category as string) || "author";
    const limit = parseInt(req.query.limit as string) || 10;

    if (category === "author") {
      // Get all users with their active posts
      const allPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.status, "active"));

      // Group by creator and calculate stats
      const creatorStats = new Map<string, {
        userId: string;
        username: string;
        avatarUrl: string | null;
        totalVolume: number;
        totalMarketCap: number;
        postsCount: number;
        totalRewards: number;
      }>();

      for (const post of allPosts) {
        if (!post.creatorId) continue;

        const existing = creatorStats.get(post.creatorId);
        const volume = parseFloat(post.totalVolume || "0");
        const marketCap = parseFloat(post.marketCap || "0");
        const rewards = parseFloat(post.creatorRewards || "0");

        if (existing) {
          existing.totalVolume += volume;
          existing.totalMarketCap += marketCap;
          existing.postsCount += 1;
          existing.totalRewards += rewards;
        } else {
          // Fetch user data
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, post.creatorId))
            .limit(1);

          if (user) {
            creatorStats.set(post.creatorId, {
              userId: user.id,
              username: user.username,
              avatarUrl: user.avatarUrl,
              totalVolume: volume,
              totalMarketCap: marketCap,
              postsCount: 1,
              totalRewards: rewards,
            });
          }
        }
      }

      // Convert to array and sort by volume
      const topCreators = Array.from(creatorStats.values())
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, limit);

      // Calculate P&L
      const leaderboardData = topCreators.map((creator, index) => {
        const initialValue = creator.postsCount * 1000;
        const pnl = initialValue > 0 ? ((creator.totalRewards / initialValue) * 100) : 0;

        return {
          rank: index + 1,
          id: creator.userId,
          user: creator.username,
          avatar: creator.avatarUrl,
          pnl: parseFloat(pnl.toFixed(2)),
          volume: parseFloat(creator.totalVolume.toFixed(3)),
          marketCap: parseFloat(creator.totalMarketCap.toFixed(2)),
          postsCount: creator.postsCount,
          category: "author" as const,
        };
      });

      return res.json({
        success: true,
        category: "author",
        data: leaderboardData,
      });
    } else if (category === "curator") {
      // Get all confirmed transactions
      const allTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.status, "confirmed"));

      // Group by user and calculate stats
      const traderStats = new Map<string, {
        userId: string;
        username: string;
        avatarUrl: string | null;
        totalBuyVolume: number;
        totalSellVolume: number;
        totalVolume: number;
        tradesCount: number;
      }>();

      for (const tx of allTransactions) {
        const existing = traderStats.get(tx.userId);
        const totalValue = parseFloat(tx.totalValue || "0");

        if (existing) {
          if (tx.type === "buy") {
            existing.totalBuyVolume += totalValue;
          } else {
            existing.totalSellVolume += totalValue;
          }
          existing.totalVolume += totalValue;
          existing.tradesCount += 1;
        } else {
          // Fetch user data
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, tx.userId))
            .limit(1);

          if (user) {
            traderStats.set(tx.userId, {
              userId: user.id,
              username: user.username,
              avatarUrl: user.avatarUrl,
              totalBuyVolume: tx.type === "buy" ? totalValue : 0,
              totalSellVolume: tx.type === "sell" ? totalValue : 0,
              totalVolume: totalValue,
              tradesCount: 1,
            });
          }
        }
      }

      // Convert to array and sort by volume
      const topTraders = Array.from(traderStats.values())
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, limit);

      // Calculate P&L
      const leaderboardData = topTraders.map((trader, index) => {
        const profit = trader.totalSellVolume - trader.totalBuyVolume;
        const pnl = trader.totalBuyVolume > 0 ? ((profit / trader.totalBuyVolume) * 100) : 0;

        return {
          rank: index + 1,
          id: trader.userId,
          user: trader.username,
          avatar: trader.avatarUrl,
          pnl: parseFloat(pnl.toFixed(2)),
          volume: parseFloat(trader.totalVolume.toFixed(3)),
          tradesCount: trader.tradesCount,
          category: "curator" as const,
        };
      });

      return res.json({
        success: true,
        category: "curator",
        data: leaderboardData,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid category. Must be 'author' or 'curator'",
      });
    }
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard data",
    });
  }
});

/**
 * GET /api/leaderboard/user/:userId
 * Get a specific user's leaderboard stats
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's posts
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.creatorId, userId));

    // Calculate author stats
    let totalVolume = 0;
    let totalMarketCap = 0;
    let totalRewards = 0;
    let postsCount = 0;

    for (const post of userPosts) {
      totalVolume += parseFloat(post.totalVolume || "0");
      totalMarketCap += parseFloat(post.marketCap || "0");
      totalRewards += parseFloat(post.creatorRewards || "0");
      postsCount += 1;
    }

    // Get user's transactions
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId));

    // Calculate curator stats
    let totalBuyVolume = 0;
    let totalSellVolume = 0;
    let totalTxVolume = 0;
    let tradesCount = 0;

    for (const tx of userTransactions) {
      const value = parseFloat(tx.totalValue || "0");
      if (tx.type === "buy") {
        totalBuyVolume += value;
      } else {
        totalSellVolume += value;
      }
      totalTxVolume += value;
      tradesCount += 1;
    }

    const authorPnl = postsCount > 0 
      ? ((totalRewards / (postsCount * 1000)) * 100) 
      : 0;

    const curatorProfit = totalSellVolume - totalBuyVolume;
    const curatorPnl = totalBuyVolume > 0 
      ? ((curatorProfit / totalBuyVolume) * 100) 
      : 0;

    return res.json({
      success: true,
      data: {
        author: {
          pnl: parseFloat(authorPnl.toFixed(2)),
          volume: parseFloat(totalVolume.toFixed(3)),
          marketCap: parseFloat(totalMarketCap.toFixed(2)),
          postsCount,
        },
        curator: {
          pnl: parseFloat(curatorPnl.toFixed(2)),
          volume: parseFloat(totalTxVolume.toFixed(3)),
          tradesCount,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user leaderboard stats:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch user stats",
    });
  }
});

export default router;

