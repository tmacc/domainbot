import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User accounts (extended by Better Auth)
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    selectedTheme: v.optional(v.string()),
    selectedProvider: v.optional(v.string()),
    selectedModel: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  // Chat threads
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Chat messages (managed by Convex Agent)
  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool"),
      v.literal("system")
    ),
    content: v.string(),
    toolCalls: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          input: v.any(),
        })
      )
    ),
    toolResults: v.optional(
      v.array(
        v.object({
          toolCallId: v.string(),
          result: v.any(),
        })
      )
    ),
    streaming: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  // Saved domains
  savedDomains: defineTable({
    userId: v.id("users"),
    domain: v.string(),
    tld: v.string(),
    available: v.boolean(),
    premium: v.optional(v.boolean()),
    price: v.optional(v.number()),
    checkedAt: v.number(),
    projectIdea: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_domain", ["domain"]),

  // Themes (built-in + user-created)
  themes: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    isBuiltIn: v.boolean(),
    createdBy: v.optional(v.id("users")),
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
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_user", ["createdBy"]),

  // Domain ideation strategies (modifiable by agent)
  ideationStrategies: defineTable({
    name: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    prefixes: v.array(v.string()),
    suffixes: v.array(v.string()),
    patterns: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // LLM model configurations
  modelConfigs: defineTable({
    provider: v.string(),
    modelId: v.string(),
    displayName: v.string(),
    enabled: v.boolean(),
    isDefault: v.boolean(),
  }),

  // Modification log (tracks self-modifications)
  modificationLog: defineTable({
    userId: v.id("users"),
    threadId: v.optional(v.id("threads")),
    modificationType: v.union(
      v.literal("theme_created"),
      v.literal("strategy_updated"),
      v.literal("ui_modified"),
      v.literal("code_modified")
    ),
    description: v.string(),
    filePath: v.optional(v.string()),
    diff: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
