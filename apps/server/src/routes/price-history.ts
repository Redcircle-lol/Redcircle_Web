import { Router } from "express";
import { db } from "../db";
import { eq, and, gte, desc, sql } from "drizzle-orm";
import * as schema from "../db";

const { priceHistory, posts, transactions } = schema;

const router = Router();

/**
 * GET /api/price-history/:postId
 * Get price history for a specific token
 * Query params:
 *   - timeframe: "1H" | "24H" | "7D" | "ALL" (default: "24H")
 */
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const timeframe = (req.query.timeframe as string) || "24H";

    // Calculate the time window
    const now = new Date();
    let startTime = new Date();
    
    switch (timeframe) {
      case "1H":
        startTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour
        break;
      case "24H":
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
        break;
      case "7D":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case "ALL":
        startTime = new Date(0); // Beginning of time
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch price history from database
    const history = await db
      .select({
        timestamp: priceHistory.timestamp,
        price: priceHistory.price,
        volume: priceHistory.volume,
      })
      .from(priceHistory)
      .where(
        and(
          eq(priceHistory.postId, postId),
          gte(priceHistory.timestamp, startTime)
        )
      )
      .orderBy(priceHistory.timestamp);

    // If no history exists, generate synthetic data based on transactions
    if (history.length === 0) {
      // Fetch the post to get initial price
      const [post] = await db
        .select({
          initialPrice: posts.initialPrice,
          currentPrice: posts.currentPrice,
          tokenizedAt: posts.tokenizedAt,
        })
        .from(posts)
        .where(eq(posts.id, postId));

      if (!post) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      // Fetch transactions for this post to build price history
      const txs = await db
        .select({
          timestamp: transactions.createdAt,
          pricePerToken: transactions.pricePerToken,
          totalValue: transactions.totalValue,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.postId, postId),
            gte(transactions.createdAt, startTime)
          )
        )
        .orderBy(transactions.createdAt);

      // Generate data points based on transactions
      const dataPoints = [];
      const initialPrice = parseFloat(post.initialPrice || "0.001");
      const currentPrice = parseFloat(post.currentPrice || initialPrice.toString());

      if (txs.length > 0) {
        // Use transaction data
        for (const tx of txs) {
          dataPoints.push({
            timestamp: tx.timestamp,
            price: parseFloat(tx.pricePerToken || "0"),
            volume: parseFloat(tx.totalValue || "0"),
          });
        }
      } else {
        // Generate synthetic progression from initial to current price
        const numPoints = timeframe === "1H" ? 12 : timeframe === "24H" ? 24 : timeframe === "7D" ? 28 : 50;
        const timeInterval = 
          timeframe === "1H" ? 5 * 60 * 1000 : // 5 minutes
          timeframe === "24H" ? 60 * 60 * 1000 : // 1 hour
          timeframe === "7D" ? 6 * 60 * 60 * 1000 : // 6 hours
          24 * 60 * 60 * 1000; // 1 day

        for (let i = 0; i <= numPoints; i++) {
          const timestamp = new Date(startTime.getTime() + i * timeInterval);
          const progress = i / numPoints;
          const price = initialPrice + (currentPrice - initialPrice) * progress;
          const variance = price * 0.02 * (Math.random() - 0.5); // Small variance
          
          dataPoints.push({
            timestamp,
            price: Math.max(initialPrice * 0.9, price + variance),
            volume: Math.random() * 10, // Random volume
          });
        }
      }

      return res.json({
        success: true,
        timeframe,
        data: dataPoints,
        synthetic: txs.length === 0,
      });
    }

    // Return actual price history
    const dataPoints = history.map((h) => ({
      timestamp: h.timestamp,
      price: parseFloat(h.price),
      volume: parseFloat(h.volume || "0"),
    }));

    return res.json({
      success: true,
      timeframe,
      data: dataPoints,
      synthetic: false,
    });
  } catch (error) {
    console.error("❌ Error fetching price history:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch price history",
    });
  }
});

/**
 * POST /api/price-history/record
 * Record a new price point
 * Body: { postId, price, volume }
 */
router.post("/record", async (req, res) => {
  try {
    const { postId, price, volume } = req.body;

    if (!postId || !price) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: postId, price",
      });
    }

    await db.insert(priceHistory).values({
      postId,
      price: price.toString(),
      volume: volume ? volume.toString() : "0",
      timestamp: new Date(),
    });

    return res.json({
      success: true,
      message: "Price recorded successfully",
    });
  } catch (error) {
    console.error("❌ Error recording price:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to record price",
    });
  }
});

export default router;

