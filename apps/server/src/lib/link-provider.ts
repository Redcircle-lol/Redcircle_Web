import { eq, or } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db";

type RedditProfile = { id: string; name: string; icon_img?: string | null };
type XProfile = { id: string; username: string; profile_image_url?: string | null };

/**
 * Attach a Reddit identity to an existing Redcircle user without switching accounts.
 * If this Reddit profile is on another row, detach it there first (unique constraints).
 */
export async function linkRedditToUser(userId: string, reddit: RedditProfile) {
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw new Error("User not found");

  const [redditOwner] = await db
    .select()
    .from(users)
    .where(eq(users.redditId, reddit.id))
    .limit(1);

  if (redditOwner && redditOwner.id !== userId) {
    await db
      .update(users)
      .set({ redditId: null, username: null, updatedAt: new Date() })
      .where(eq(users.id, redditOwner.id));
  }

  const [usernameOwner] = await db
    .select()
    .from(users)
    .where(eq(users.username, reddit.name))
    .limit(1);

  if (usernameOwner && usernameOwner.id !== userId) {
    await db
      .update(users)
      .set({ username: null, updatedAt: new Date() })
      .where(eq(users.id, usernameOwner.id));
  }

  const [updated] = await db
    .update(users)
    .set({
      redditId: reddit.id,
      username: reddit.name,
      avatarUrl: reddit.icon_img || target.avatarUrl,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) throw new Error("Failed to link Reddit account");
  return updated;
}

/**
 * Attach an X identity to an existing Redcircle user without switching accounts.
 * If this X profile is on another row, detach it there first (unique constraints).
 */
export async function linkXToUser(userId: string, x: XProfile) {
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) throw new Error("User not found");

  const [xOwner] = await db
    .select()
    .from(users)
    .where(or(eq(users.xId, x.id), eq(users.xUsername, x.username)))
    .limit(1);

  if (xOwner && xOwner.id !== userId) {
    await db
      .update(users)
      .set({ xId: null, xUsername: null, updatedAt: new Date() })
      .where(eq(users.id, xOwner.id));
  }

  const [updated] = await db
    .update(users)
    .set({
      xId: x.id,
      xUsername: x.username,
      avatarUrl: x.profile_image_url ?? target.avatarUrl,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) throw new Error("Failed to link X account");
  return updated;
}
