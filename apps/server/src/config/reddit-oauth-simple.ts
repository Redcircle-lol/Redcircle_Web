import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import * as schema from "../db";
import { eq } from "drizzle-orm";

const { users } = schema;

const router = Router();

// Reddit OAuth config - All values MUST come from environment variables
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_REDIRECT_URI = process.env.REDDIT_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL;

// Only validate if we're actually using user authentication routes
// (Reddit post fetching uses different OAuth flow and doesn't need these)
const isUserAuthEnabled = REDDIT_REDIRECT_URI && FRONTEND_URL;

if (!isUserAuthEnabled) {
  console.warn('⚠️ Reddit user authentication disabled. Set REDDIT_REDIRECT_URI and FRONTEND_URL to enable.');
}

// Only enable routes if user auth is configured
if (isUserAuthEnabled && REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET && REDDIT_REDIRECT_URI && FRONTEND_URL) {
  // Step 1: Redirect to Reddit
  router.get("/auth/reddit", (_req, res) => {
    const state = Math.random().toString(36).substring(7);
    // URL encode the redirect_uri to handle special characters
    const encodedRedirectUri = encodeURIComponent(REDDIT_REDIRECT_URI);
    const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${REDDIT_CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${encodedRedirectUri}&duration=permanent&scope=identity`;
    console.log("🔴 Redirecting to Reddit OAuth:", authUrl);
    res.redirect(authUrl);
  });

  // Step 2: Handle callback from Reddit
  router.get("/auth/reddit/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${FRONTEND_URL}/signin?error=auth_failed`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${REDDIT_REDIRECT_URI}`,
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error("No access token received");
    }

    // Get user info from Reddit
    const userResponse = await fetch("https://oauth.reddit.com/api/v1/me", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "User-Agent": "RedCircle/1.0",
      },
    });

    const redditUser = await userResponse.json();

    // Check if user exists in our database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.redditId, redditUser.id))
      .limit(1);

    let user;
    if (existingUser.length > 0) {
      // Update last login
      const [updatedUser] = await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, existingUser[0].id))
        .returning();
      user = updatedUser;
      console.log("✅ User logged in:", user.username);
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          redditId: redditUser.id,
          username: redditUser.name,
          avatarUrl: redditUser.icon_img || null,
          lastLoginAt: new Date(),
        })
        .returning();
      user = newUser;
      console.log("✅ New user created:", user.username);
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('❌ JWT_SECRET is not set in environment variables');
    }
    
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect to frontend signin page with token and user
    res.redirect(
      `${FRONTEND_URL}/signin?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`
    );
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.redirect(`${FRONTEND_URL}/signin?error=auth_failed`);
  }
});
} else {
  console.log('ℹ️ Reddit user authentication routes disabled');
}

export default router;

