import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// List all ideation strategies
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ideationStrategies")
      .order("asc")
      .collect();
  },
});

// Get a single strategy by name
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("ideationStrategies")
      .filter((q) => q.eq(q.field("name"), name))
      .first();
  },
});

// Get only enabled strategies
export const listEnabled = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("ideationStrategies")
      .filter((q) => q.eq(q.field("enabled"), true))
      .collect();
  },
});

// Create or update a strategy
export const upsert = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    prefixes: v.array(v.string()),
    suffixes: v.array(v.string()),
    patterns: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if strategy exists
    const existing = await ctx.db
      .query("ideationStrategies")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        description: args.description,
        prefixes: args.prefixes,
        suffixes: args.suffixes,
        patterns: args.patterns,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("ideationStrategies", {
      name: args.name,
      description: args.description,
      enabled: true,
      prefixes: args.prefixes,
      suffixes: args.suffixes,
      patterns: args.patterns,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Toggle a strategy's enabled status
export const toggleEnabled = mutation({
  args: {
    strategyId: v.id("ideationStrategies"),
  },
  handler: async (ctx, { strategyId }) => {
    const strategy = await ctx.db.get(strategyId);
    if (!strategy) {
      throw new Error("Strategy not found");
    }

    await ctx.db.patch(strategyId, {
      enabled: !strategy.enabled,
      updatedAt: Date.now(),
    });

    return { enabled: !strategy.enabled };
  },
});

// Delete a strategy
export const remove = mutation({
  args: {
    strategyId: v.id("ideationStrategies"),
  },
  handler: async (ctx, { strategyId }) => {
    await ctx.db.delete(strategyId);
  },
});

// Seed default strategies (run once during setup)
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("ideationStrategies").first();
    if (existing) {
      // Already seeded
      return { seeded: false, message: "Strategies already exist" };
    }

    const defaultStrategies = [
      {
        name: "Prefixed Keywords",
        description: "Add common prefixes like 'get', 'try', 'use' to keywords",
        enabled: true,
        prefixes: ["get", "try", "use", "go", "hey", "my", "the", "just", "now"],
        suffixes: [],
        patterns: ["{prefix}{keyword}"],
      },
      {
        name: "Suffixed Keywords",
        description: "Add common suffixes like 'app', 'hq', 'hub' to keywords",
        enabled: true,
        prefixes: [],
        suffixes: ["app", "hq", "hub", "lab", "base", "ly", "ify", "er", "ster"],
        patterns: ["{keyword}{suffix}"],
      },
      {
        name: "Compound Words",
        description: "Combine multiple keywords together",
        enabled: true,
        prefixes: [],
        suffixes: [],
        patterns: ["{keyword1}{keyword2}", "{keyword2}{keyword1}"],
      },
      {
        name: "Short Forms",
        description: "Use abbreviations and shortened forms",
        enabled: true,
        prefixes: [],
        suffixes: [],
        patterns: ["{keyword:3}", "{keyword:4}", "{keyword:5}"],
      },
    ];

    for (const strategy of defaultStrategies) {
      await ctx.db.insert("ideationStrategies", {
        ...strategy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { seeded: true, count: defaultStrategies.length };
  },
});
