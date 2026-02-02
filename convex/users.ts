import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get or create an anonymous user
export const getOrCreateAnonymous = mutation({
  args: { anonymousId: v.string() },
  handler: async (ctx, { anonymousId }) => {
    // Check if user exists with this anonymous ID
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", `anon_${anonymousId}@domainbot.local`))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new anonymous user
    const userId = await ctx.db.insert("users", {
      name: "Anonymous User",
      email: `anon_${anonymousId}@domainbot.local`,
      selectedTheme: "claude",
      selectedModel: "claude-3-5-sonnet-20241022",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

export const current = query({
  args: {},
  handler: async () => {
    // Without auth, return null
    // In production with Better Auth, this would check the session
    return null;
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});

export const updateTheme = mutation({
  args: {
    userId: v.id("users"),
    theme: v.string()
  },
  handler: async (ctx, { userId, theme }) => {
    await ctx.db.patch(userId, { selectedTheme: theme });
    return { success: true };
  },
});

export const updateModel = mutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, { userId, provider, modelId }) => {
    await ctx.db.patch(userId, {
      selectedModel: modelId
    });
    return { success: true };
  },
});
