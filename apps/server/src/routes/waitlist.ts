import { Router } from "express";
import { db } from "../db";
import * as schema from "../db";
import { z } from "zod";
import { eq } from "drizzle-orm";

const { waitlist } = schema;
const router = Router();

// Validation schema
const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
  referralSource: z.string().optional(),
});

// POST /api/waitlist - Join waitlist
router.post("/", async (req, res) => {
  try {
    const validation = emailSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const { email, referralSource } = validation.data;

    // Check if email already exists
    const existingEntry = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.email, email))
      .limit(1);

    if (existingEntry.length > 0) {
      return res.status(409).json({
        error: "Email already registered",
        message: "This email is already on the waitlist",
      });
    }

    // Add to waitlist
    const [newEntry] = await db
      .insert(waitlist)
      .values({
        email,
        referralSource,
      })
      .returning();

    return res.status(201).json({
      message: "Successfully joined the waitlist!",
      data: newEntry,
    });
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to join waitlist",
    });
  }
});

// GET /api/waitlist/count - Get waitlist count (optional for showing social proof)
router.get("/count", async (_req, res) => {
  try {
    const entries = await db.select().from(waitlist);
    const count = entries.length;

    return res.status(200).json({
      count,
    });
  } catch (error) {
    console.error("Error getting waitlist count:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
