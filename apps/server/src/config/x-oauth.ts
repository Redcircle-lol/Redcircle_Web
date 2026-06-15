import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { db } from "../db";
import * as schema from "../db";
import { eq, or } from "drizzle-orm";

const { users } = schema;

const router: import("express").Router = Router();

const X_CLIENT_ID     = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const X_REDIRECT_URI  = process.env.X_REDIRECT_URI;
const FRONTEND_URL    = process.env.FRONTEND_URL;

const isEnabled = !!(X_CLIENT_ID && X_CLIENT_SECRET && X_REDIRECT_URI && FRONTEND_URL);

// In-memory PKCE store: state → { codeVerifier, expiry }
// Fine for single-process deploys; swap for Redis if horizontally scaled.
const pkceStore = new Map<string, { codeVerifier: string; expiry: number }>();

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

if (isEnabled) {
  // ── Step 1: Redirect to X ────────────────────────────────────────────────
  router.get("/auth/x", (_req, res) => {
    const state        = crypto.randomBytes(16).toString("hex");
    const codeVerifier = generateCodeVerifier();

    // Store for 10 minutes
    pkceStore.set(state, { codeVerifier, expiry: Date.now() + 10 * 60 * 1000 });

    const params = new URLSearchParams({
      response_type:         "code",
      client_id:             X_CLIENT_ID!,
      redirect_uri:          X_REDIRECT_URI!,
      scope:                 "tweet.read users.read",
      state,
      code_challenge:        generateCodeChallenge(codeVerifier),
      code_challenge_method: "S256",
    });

    res.redirect(`https://x.com/i/oauth2/authorize?${params}`);
  });

  // ── Step 2: Handle callback from X ───────────────────────────────────────
  router.get("/auth/x/callback", async (req, res) => {
    const { code, state, error } = req.query as Record<string, string | undefined>;

    if (error || !code || !state) {
      return res.redirect(`${FRONTEND_URL}/signin?error=x_auth_failed`);
    }

    const stored = pkceStore.get(state);
    pkceStore.delete(state);

    if (!stored || Date.now() > stored.expiry) {
      return res.redirect(`${FRONTEND_URL}/signin?error=x_state_invalid`);
    }

    try {
      // Web App (confidential client) — requires Basic auth with client_id:client_secret.
      const basicAuth = Buffer.from(`${X_CLIENT_ID!}:${X_CLIENT_SECRET!}`).toString("base64");
      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type":  "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          grant_type:    "authorization_code",
          code:          code,
          redirect_uri:  X_REDIRECT_URI!,
          code_verifier: stored.codeVerifier,
        } as Record<string, string>),
      });

      const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
      if (!tokenData.access_token) {
        return res.redirect(`${FRONTEND_URL}/signin?error=x_auth_failed`);
      }

      // Fetch authenticated user
      const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url,name", {
        headers: { "Authorization": `Bearer ${tokenData.access_token}` },
      });
      const { data: xUser } = await userRes.json() as { data?: { id: string; username: string; name: string; profile_image_url?: string } };

      if (!xUser?.id) {
        return res.redirect(`${FRONTEND_URL}/signin?error=x_auth_failed`);
      }

      // Upsert user — match by xId, fall back to xUsername
      const [existing] = await db
        .select()
        .from(users)
        .where(or(eq(users.xId, xUser.id), eq(users.xUsername, xUser.username)))
        .limit(1);

      let user: typeof existing;
      if (existing) {
        const [updated] = await db
          .update(users)
          .set({ xId: xUser.id, xUsername: xUser.username, avatarUrl: xUser.profile_image_url ?? existing.avatarUrl, lastLoginAt: new Date() })
          .where(eq(users.id, existing.id))
          .returning();
        user = updated;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            xId:        xUser.id,
            xUsername:  xUser.username,
            avatarUrl:  xUser.profile_image_url ?? null,
            lastLoginAt: new Date(),
          })
          .returning();
        user = created;
      }

      if (!user) throw new Error("Failed to create or retrieve X user");

      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) throw new Error("JWT_SECRET not set");

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

      res.redirect(`${FRONTEND_URL}/signin?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch {
      res.redirect(`${FRONTEND_URL}/signin?error=x_auth_failed`);
    }
  });
}

export default router;
