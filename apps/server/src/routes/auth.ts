import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db";
import { authenticateToken } from "../middleware/auth";

const router: Router = Router();

/** Fields safe to expose to the client. */
function publicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    redditId: user.redditId,
    username: user.username,
    xId: user.xId,
    xUsername: user.xUsername,
    avatarUrl: user.avatarUrl,
    email: user.email,
    points: user.points,
    walletAddress: user.walletAddress,
  };
}

/**
 * GET /api/auth/me
 * Returns the current user profile from the database (source of truth for linked providers).
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "unauthorized", message: "User not found" });
    }

    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("❌ Error fetching auth profile:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

export default router;
