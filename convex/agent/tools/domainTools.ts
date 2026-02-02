import { z } from "zod";

// Domain name generation patterns
const PREFIXES = ["get", "my", "use", "try", "go", "hey", "hello", "the", "just", "now", "be", "do"];
const SUFFIXES = ["app", "io", "hq", "hub", "lab", "base", "ly", "ify", "er", "ster"];
const TLDS = [".com", ".io", ".co", ".dev", ".app", ".ai"];

/**
 * Generate domain name suggestions based on keywords
 */
export function generateDomainNames(
  keywords: string[],
  options?: {
    vibe?: string;
    tlds?: string[];
    maxResults?: number;
  }
): string[] {
  const tlds = options?.tlds ?? TLDS;
  const maxResults = options?.maxResults ?? 20;
  const suggestions: Set<string> = new Set();

  // Clean keywords
  const cleanKeywords = keywords
    .map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((k) => k.length > 0);

  for (const keyword of cleanKeywords) {
    // Direct keyword
    for (const tld of tlds) {
      suggestions.add(`${keyword}${tld}`);
    }

    // With prefixes
    for (const prefix of PREFIXES) {
      for (const tld of tlds) {
        suggestions.add(`${prefix}${keyword}${tld}`);
      }
    }

    // With suffixes
    for (const suffix of SUFFIXES) {
      for (const tld of tlds) {
        suggestions.add(`${keyword}${suffix}${tld}`);
      }
    }

    // Compound keywords
    for (const otherKeyword of cleanKeywords) {
      if (otherKeyword !== keyword) {
        for (const tld of tlds) {
          suggestions.add(`${keyword}${otherKeyword}${tld}`);
        }
      }
    }
  }

  // Convert to array and limit results
  return Array.from(suggestions).slice(0, maxResults);
}

// Tool schemas for Convex Agent
export const domainToolSchemas = {
  generateDomainNames: {
    description:
      "Generate creative domain name suggestions based on keywords and project description",
    parameters: z.object({
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
  },

  checkDomainAvailability: {
    description: "Check if specific domains are available for registration",
    parameters: z.object({
      domains: z
        .array(z.string())
        .describe("List of full domain names to check (e.g., ['coolapp.io', 'myproject.com'])"),
    }),
  },

  saveDomain: {
    description: "Save a domain to the user's favorites list",
    parameters: z.object({
      domain: z.string().describe("The full domain name to save"),
      notes: z.string().optional().describe("Optional notes about why this domain is good"),
      projectIdea: z.string().optional().describe("The project idea this domain is for"),
    }),
  },

  getSavedDomains: {
    description: "Get the user's list of saved domain names",
    parameters: z.object({}),
  },

  removeSavedDomain: {
    description: "Remove a domain from the user's saved list",
    parameters: z.object({
      domain: z.string().describe("The domain to remove"),
    }),
  },
};
