import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

// List all themes
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("themes").collect();
  },
});

// Get theme by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("themes")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
  },
});

// Create a new theme
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    variables: v.object({
      colorPrimary: v.string(),
      colorSecondary: v.string(),
      colorAccent: v.string(),
      colorBackground: v.string(),
      colorSurface: v.string(),
      colorText: v.string(),
      colorTextSecondary: v.string(),
      fontFamilySans: v.string(),
      fontFamilyMono: v.string(),
      borderRadius: v.string(),
      shadowStyle: v.string(),
    }),
    customCSS: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Get user from auth session
    const themeId = await ctx.db.insert("themes", {
      ...args,
      isBuiltIn: false,
      createdBy: undefined, // TODO: Set from auth
      createdAt: Date.now(),
    });
    return themeId;
  },
});

// Seed built-in themes
export const seedBuiltInThemes = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if themes already exist
    const existingThemes = await ctx.db.query("themes").collect();
    if (existingThemes.length > 0) {
      return { message: "Themes already seeded" };
    }

    // Claude theme
    await ctx.db.insert("themes", {
      name: "Claude",
      slug: "claude",
      description: "Clean, modern design inspired by Anthropic's Claude",
      isBuiltIn: true,
      variables: {
        colorPrimary: "#5a3dc9",
        colorSecondary: "#7c5cdb",
        colorAccent: "#00d4aa",
        colorBackground: "#ffffff",
        colorSurface: "#f5f5f5",
        colorText: "#1a1a1a",
        colorTextSecondary: "#666666",
        fontFamilySans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontFamilyMono: "'SF Mono', Consolas, monospace",
        borderRadius: "0.5rem",
        shadowStyle: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      },
      createdAt: Date.now(),
    });

    // Retro 80s theme
    await ctx.db.insert("themes", {
      name: "Retro 80s",
      slug: "retro80s",
      description: "Neon-lit 1980s computing aesthetic with CRT vibes",
      isBuiltIn: true,
      variables: {
        colorPrimary: "#ff00ff",
        colorSecondary: "#00ffff",
        colorAccent: "#ffff00",
        colorBackground: "#0a0a0a",
        colorSurface: "#1a1a2e",
        colorText: "#00ff41",
        colorTextSecondary: "#00cccc",
        fontFamilySans: "'VT323', 'Courier New', monospace",
        fontFamilyMono: "'VT323', monospace",
        borderRadius: "0",
        shadowStyle: "0 0 10px rgba(255, 0, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)",
      },
      customCSS: `
        /* CRT scanline effect */
        [data-theme="retro80s"] body {
          background-image: linear-gradient(transparent 50%, rgba(0, 0, 0, 0.1) 50%);
          background-size: 100% 4px;
        }
        [data-theme="retro80s"] * {
          text-shadow: 0 0 5px currentColor;
        }
      `,
      createdAt: Date.now(),
    });

    return { message: "Built-in themes seeded successfully" };
  },
});
