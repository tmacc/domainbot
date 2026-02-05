import { Agent, createTool } from "@convex-dev/agent";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { components, internal } from "../_generated/api";
import { SYSTEM_PROMPT } from "./prompts";

// Configure Anthropic provider to use Vercel AI Gateway
// Gateway expects /v1/messages endpoint and model names with provider prefix
const anthropic = createAnthropic({
  baseURL: "https://ai-gateway.vercel.sh/v1",
  apiKey: process.env.VERCEL_AI_GATEWAY_KEY,
});

/**
 * DomainBot Agent - properly configured with tools
 */
export const domainBot = new Agent(components.agent, {
  name: "DomainBot",
  languageModel: anthropic("anthropic/claude-sonnet-4.5"),
  // Note: Embeddings disabled - would require separate Voyage AI or OpenAI setup
  instructions: SYSTEM_PROMPT,
  maxSteps: 5, // Allow multiple tool call rounds (generate domains, then check availability)
  tools: [
    // Domain generation tool
    createTool({
      name: "generateDomainNames",
      description:
        "Generate creative domain name suggestions based on keywords and project description",
      args: z.object({
        keywords: z
          .array(z.string())
          .describe("Key words extracted from the project description"),
        vibe: z
          .string()
          .optional()
          .describe("The feel/aesthetic of the project (e.g., 'professional', 'fun', 'minimal')"),
        tlds: z
          .array(z.string())
          .optional()
          .describe("Specific TLDs to use (defaults to .com, .io, .co, .dev, .app, .ai)"),
      }),
      handler: async (_ctx, args) => {
        // Generate domain suggestions locally
        const tlds = args.tlds ?? [".com", ".io", ".co", ".dev", ".app", ".ai"];
        const prefixes = ["get", "my", "use", "try", "go", "hey"];
        const suffixes = ["app", "hq", "hub", "ly", "ify"];
        const suggestions: Set<string> = new Set();

        const cleanKeywords = args.keywords
          .map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""))
          .filter((k) => k.length > 0);

        for (const keyword of cleanKeywords.slice(0, 3)) {
          // Direct keyword with TLDs
          for (const tld of tlds.slice(0, 4)) {
            suggestions.add(`${keyword}${tld}`);
          }
          // With prefixes
          for (const prefix of prefixes.slice(0, 3)) {
            suggestions.add(`${prefix}${keyword}.com`);
            suggestions.add(`${prefix}${keyword}.io`);
          }
          // With suffixes
          for (const suffix of suffixes.slice(0, 2)) {
            suggestions.add(`${keyword}${suffix}.com`);
          }
        }

        // Compound words
        if (cleanKeywords.length >= 2) {
          suggestions.add(`${cleanKeywords[0]}${cleanKeywords[1]}.com`);
          suggestions.add(`${cleanKeywords[0]}${cleanKeywords[1]}.io`);
        }

        return Array.from(suggestions).slice(0, 8);
      },
    }),

    // Domain availability checking tool
    createTool({
      name: "checkDomainAvailability",
      description: "Check if specific domains are available for registration and get pricing",
      args: z.object({
        domains: z
          .array(z.string())
          .describe("List of full domain names to check (e.g., ['coolapp.io', 'myproject.com'])"),
      }),
      handler: async (ctx, args) => {
        // Call our existing domain checking action
        const results = await ctx.runAction(internal.actions.checkDomains, {
          domains: args.domains,
        });
        return results;
      },
    }),

    // Save domain tool
    createTool({
      name: "saveDomain",
      description: "Save a domain to the user's favorites list for later",
      args: z.object({
        domain: z.string().describe("The full domain name to save"),
        notes: z.string().optional().describe("Optional notes about why this domain is good"),
        projectIdea: z.string().optional().describe("The project idea this domain is for"),
      }),
      handler: async (ctx, args) => {
        // Get userId from thread metadata
        const thread = await ctx.runQuery(components.agent.threads.getThread, {
          threadId: ctx.threadId!,
        });

        if (!thread?.metadata?.userId) {
          return { success: false, error: "No user context available" };
        }

        const tld = args.domain.substring(args.domain.lastIndexOf("."));
        await ctx.runMutation(internal.domains.saveInternal, {
          userId: thread.metadata.userId,
          domain: args.domain,
          tld,
          available: true,
          projectIdea: args.projectIdea,
          notes: args.notes,
        });

        return { success: true, domain: args.domain };
      },
    }),

    // Get saved domains tool
    createTool({
      name: "getSavedDomains",
      description: "Get the user's list of saved domain names",
      args: z.object({}),
      handler: async (ctx) => {
        const thread = await ctx.runQuery(components.agent.threads.getThread, {
          threadId: ctx.threadId!,
        });

        if (!thread?.metadata?.userId) {
          return [];
        }

        const domains = await ctx.runQuery(internal.domains.listByUserInternal, {
          userId: thread.metadata.userId,
        });

        return domains.map((d) => ({
          domain: d.domain,
          notes: d.notes,
          savedAt: d.createdAt,
        }));
      },
    }),
  ],
});

// Export for use elsewhere
export { SYSTEM_PROMPT };

// Model options available
export const AVAILABLE_MODELS = [
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    isDefault: true,
  },
  {
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    isDefault: false,
  },
];
