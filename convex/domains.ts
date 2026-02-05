import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

// List saved domains for a user
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("savedDomains")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Save a domain
export const save = mutation({
  args: {
    userId: v.id("users"),
    domain: v.string(),
    tld: v.string(),
    available: v.boolean(),
    premium: v.optional(v.boolean()),
    price: v.optional(v.number()),
    projectIdea: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if domain already saved
    const existing = await ctx.db
      .query("savedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...args,
        checkedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("savedDomains", {
      ...args,
      checkedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

// Remove a saved domain
export const remove = mutation({
  args: { domainId: v.id("savedDomains") },
  handler: async (ctx, { domainId }) => {
    await ctx.db.delete(domainId);
  },
});

// Update notes on a saved domain
export const updateNotes = mutation({
  args: {
    domainId: v.id("savedDomains"),
    notes: v.string(),
  },
  handler: async (ctx, { domainId, notes }) => {
    await ctx.db.patch(domainId, { notes });
  },
});

// Internal functions for agent tools
export const listByUserInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("savedDomains")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const saveInternal = internalMutation({
  args: {
    userId: v.id("users"),
    domain: v.string(),
    tld: v.string(),
    available: v.boolean(),
    premium: v.optional(v.boolean()),
    price: v.optional(v.number()),
    projectIdea: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if domain already saved
    const existing = await ctx.db
      .query("savedDomains")
      .withIndex("by_domain", (q) => q.eq("domain", args.domain))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        checkedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("savedDomains", {
      ...args,
      checkedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});
