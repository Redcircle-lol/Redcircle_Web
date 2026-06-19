/** Gemini model for token name/symbol suggestions (Reddit & X posts). */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
