import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Log a modification
export const log = mutation({
  args: {
    userId: v.id("users"),
    modificationType: v.union(
      v.literal("theme_created"),
      v.literal("strategy_updated"),
      v.literal("ui_modified"),
      v.literal("code_modified")
    ),
    description: v.string(),
    filePath: v.optional(v.string()),
    diff: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("modificationLog", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// List modifications by user
export const listByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit }) => {
    const query = ctx.db
      .query("modificationLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    if (limit) {
      return await query.take(limit);
    }

    return await query.collect();
  },
});

// Get all modifications (for admin view)
export const listAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const query = ctx.db.query("modificationLog").order("desc");

    if (limit) {
      return await query.take(limit);
    }

    return await query.collect();
  },
});
