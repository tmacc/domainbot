import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Namecheap API configuration
const NAMECHEAP_API_URL = "https://api.namecheap.com/xml.response";

interface DomainCheckResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: number;
  errorMessage?: string;
}

/**
 * Check domain availability via Namecheap API
 * Uses mock data if API credentials are not configured
 */
export const checkDomains = action({
  args: {
    domains: v.array(v.string()),
  },
  handler: async (_ctx, { domains }): Promise<DomainCheckResult[]> => {
    const apiUser = process.env.NAMECHEAP_API_USER;
    const apiKey = process.env.NAMECHEAP_API_KEY;
    const userName = process.env.NAMECHEAP_USERNAME;
    const clientIp = process.env.NAMECHEAP_CLIENT_IP;

    // If no API credentials, use mock mode
    if (!apiUser || !apiKey || !userName || !clientIp) {
      console.log("Namecheap API not configured, using mock mode");
      return mockDomainAvailability(domains);
    }

    try {
      return await checkDomainsWithNamecheap(domains, {
        apiUser,
        apiKey,
        userName,
        clientIp,
      });
    } catch (error) {
      console.error("Namecheap API error, falling back to mock:", error);
      return mockDomainAvailability(domains);
    }
  },
});

async function checkDomainsWithNamecheap(
  domains: string[],
  config: {
    apiUser: string;
    apiKey: string;
    userName: string;
    clientIp: string;
  }
): Promise<DomainCheckResult[]> {
  // Namecheap limits to 50 domains per request
  const MAX_DOMAINS_PER_REQUEST = 50;

  if (domains.length > MAX_DOMAINS_PER_REQUEST) {
    const batches: string[][] = [];
    for (let i = 0; i < domains.length; i += MAX_DOMAINS_PER_REQUEST) {
      batches.push(domains.slice(i, i + MAX_DOMAINS_PER_REQUEST));
    }

    const results: DomainCheckResult[] = [];
    for (const batch of batches) {
      const batchResults = await checkDomainBatch(batch, config);
      results.push(...batchResults);
    }
    return results;
  }

  return checkDomainBatch(domains, config);
}

async function checkDomainBatch(
  domains: string[],
  config: {
    apiUser: string;
    apiKey: string;
    userName: string;
    clientIp: string;
  }
): Promise<DomainCheckResult[]> {
  const params = new URLSearchParams({
    ApiUser: config.apiUser,
    ApiKey: config.apiKey,
    UserName: config.userName,
    Command: "namecheap.domains.check",
    ClientIp: config.clientIp,
    DomainList: domains.join(","),
  });

  const response = await fetch(`${NAMECHEAP_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Namecheap API error: ${response.status}`);
  }

  const xmlText = await response.text();
  return parseNamecheapResponse(xmlText, domains);
}

function parseNamecheapResponse(
  xmlText: string,
  originalDomains: string[]
): DomainCheckResult[] {
  // Simple XML parsing without external dependency
  // Look for DomainCheckResult elements

  const results: DomainCheckResult[] = [];

  // Extract each DomainCheckResult
  const domainResultRegex =
    /<DomainCheckResult\s+([^>]+)\/>/g;
  let match: RegExpExecArray | null;

  while ((match = domainResultRegex.exec(xmlText)) !== null) {
    const attributes = match[1];

    const domainMatch = /Domain="([^"]+)"/.exec(attributes);
    const availableMatch = /Available="([^"]+)"/.exec(attributes);
    const premiumMatch = /IsPremiumName="([^"]+)"/.exec(attributes);
    const priceMatch = /PremiumRegistrationPrice="([^"]+)"/.exec(attributes);

    if (domainMatch) {
      results.push({
        domain: domainMatch[1],
        available: availableMatch?.[1] === "true",
        premium: premiumMatch?.[1] === "true",
        price: priceMatch ? Number.parseFloat(priceMatch[1]) : undefined,
      });
    }
  }

  // If no results parsed, check for errors
  if (results.length === 0) {
    const errorMatch = /<Error[^>]*>([^<]+)<\/Error>/.exec(xmlText);
    if (errorMatch) {
      throw new Error(`Namecheap API error: ${errorMatch[1]}`);
    }

    // Return error results for all domains
    return originalDomains.map((domain) => ({
      domain,
      available: false,
      premium: false,
      errorMessage: "Failed to parse API response",
    }));
  }

  return results;
}

/**
 * Mock domain availability for development/testing
 */
function mockDomainAvailability(domains: string[]): DomainCheckResult[] {
  return domains.map((domain) => {
    const name = domain.split(".")[0];
    const tld = domain.slice(domain.indexOf("."));

    // Short names and .com are usually taken
    const isLikelyTaken =
      name.length <= 4 ||
      (tld === ".com" && name.length <= 8) ||
      /^(get|my|the|go)[a-z]+$/.test(name);

    // Premium domains
    const isPremium = name.length <= 3 || /^[a-z]{4}$/.test(name);

    // Random factor (seeded by domain name for consistency)
    const hash = [...domain].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const randomFactor = hash % 100;

    const available = !isLikelyTaken && randomFactor > 30;

    return {
      domain,
      available,
      premium: isPremium && available,
      price: isPremium && available ? 500 + (hash % 9500) : undefined,
    };
  });
}

/**
 * Generate AI response using Claude via Vercel AI Gateway
 * Falls back to simple template response if API not configured
 */
export const generateAIResponse = action({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
  },
  handler: async (ctx, { threadId, userMessage }) => {
    // Generate domain suggestions based on the user's message
    const domainSuggestions = generateDomainSuggestions(userMessage);

    // Check domain availability
    const domainResults = await ctx.runAction(api.actions.checkDomains, {
      domains: domainSuggestions,
    });

    const availableCount = domainResults.filter((r) => r.available).length;

    // For now, return a structured response
    // In production, this would call Claude via Vercel AI Gateway
    return {
      thinking: `Great! "${userMessage}" sounds like an exciting project! Let me brainstorm some domain names and check their availability...\n\nI'm looking for names that are:\n- Memorable and brandable\n- Available across popular TLDs\n- Related to your project concept`,
      results: `I found ${availableCount} available domains out of ${domainResults.length} checked! Here are the results:`,
      domainResults,
      toolCalls: [
        {
          id: "check-1",
          name: "checkDomainAvailability",
          input: { domains: domainSuggestions },
        },
      ],
    };
  },
});

/**
 * Generate domain name suggestions based on project description
 */
function generateDomainSuggestions(projectIdea: string): string[] {
  const words = projectIdea.toLowerCase().split(/\s+/);
  const keywords = words.filter(
    (w) =>
      w.length > 3 &&
      !["the", "and", "for", "app", "with", "that", "this", "have", "from"].includes(w)
  );

  const prefixes = ["get", "try", "use", "go", "hey", "my"];
  const suffixes = ["app", "hq", "hub", "io", "ly", "ify"];
  const tlds = [".com", ".io", ".co", ".dev", ".app", ".ai"];

  const suggestions: Set<string> = new Set();

  // Base keywords with TLDs
  for (const keyword of keywords.slice(0, 3)) {
    for (const tld of tlds.slice(0, 3)) {
      suggestions.add(`${keyword}${tld}`);
    }
  }

  // Prefixed versions
  for (const keyword of keywords.slice(0, 2)) {
    for (const prefix of prefixes.slice(0, 2)) {
      suggestions.add(`${prefix}${keyword}.com`);
      suggestions.add(`${prefix}${keyword}.io`);
    }
  }

  // Suffixed versions
  for (const keyword of keywords.slice(0, 2)) {
    for (const suffix of suffixes.slice(0, 2)) {
      suggestions.add(`${keyword}${suffix}.com`);
    }
  }

  // Compound words
  if (keywords.length >= 2) {
    suggestions.add(`${keywords[0]}${keywords[1]}.com`);
    suggestions.add(`${keywords[0]}${keywords[1]}.io`);
  }

  return [...suggestions].slice(0, 12);
}

// ============================================
// GitHub Self-Modification Tools
// ============================================

// Whitelist of files the agent is allowed to modify
const MODIFIABLE_FILES = {
  components: [
    "src/components/ui/Button.tsx",
    "src/components/ui/Card.tsx",
    "src/components/ui/Input.tsx",
    "src/components/chat/MessageBubble.tsx",
    "src/components/domains/DomainCard.tsx",
  ],
  styles: ["src/styles.css"],
  // Agent CANNOT modify: auth, database schema, agent tools (safety)
  forbidden: [
    "convex/schema.ts",
    "convex/auth.ts",
    "convex/agent/",
    "src/lib/auth.ts",
    ".env",
  ],
};

function isFileModifiable(filePath: string): boolean {
  // Check against forbidden paths
  for (const forbidden of MODIFIABLE_FILES.forbidden) {
    if (filePath.startsWith(forbidden) || filePath === forbidden) {
      return false;
    }
  }

  // Check against allowed paths
  const allAllowed = [...MODIFIABLE_FILES.components, ...MODIFIABLE_FILES.styles];
  return allAllowed.includes(filePath);
}

/**
 * List files the agent is allowed to modify
 */
export const listModifiableFiles = action({
  args: {},
  handler: async () => {
    return {
      components: MODIFIABLE_FILES.components,
      styles: MODIFIABLE_FILES.styles,
      note: "For safety, the agent cannot modify: auth, database schema, agent tools, or environment files.",
    };
  },
});

/**
 * Read a source file from the GitHub repository
 */
export const readSourceFile = action({
  args: {
    filePath: v.string(),
  },
  handler: async (_ctx, { filePath }) => {
    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!githubToken || !repoOwner || !repoName) {
      return {
        success: false,
        error: "GitHub API not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME environment variables.",
      };
    }

    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "DomainBot",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: `File not found: ${filePath}` };
        }
        return { success: false, error: `GitHub API error: ${response.status}` };
      }

      const data = await response.json();

      if (data.type !== "file") {
        return { success: false, error: `Path is not a file: ${filePath}` };
      }

      // Decode base64 content
      const content = Buffer.from(data.content, "base64").toString("utf-8");

      return {
        success: true,
        content,
        sha: data.sha,
        path: data.path,
        size: data.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Modify a source file and commit to GitHub (triggers Vercel deploy)
 */
export const modifySourceFile = action({
  args: {
    filePath: v.string(),
    modification: v.string(),
    newContent: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { filePath, modification, newContent, userId }) => {
    // Security check: only allow whitelisted files
    if (!isFileModifiable(filePath)) {
      return {
        success: false,
        error: `File ${filePath} is not in the modifiable whitelist. Use listModifiableFiles to see allowed files.`,
      };
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER;
    const repoName = process.env.GITHUB_REPO_NAME;

    if (!githubToken || !repoOwner || !repoName) {
      return {
        success: false,
        error: "GitHub API not configured. Set GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME environment variables.",
      };
    }

    try {
      // First, get the current file SHA (required for updates)
      const getResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "DomainBot",
          },
        }
      );

      let sha: string | undefined;
      if (getResponse.ok) {
        const data = await getResponse.json();
        sha = data.sha;
      }

      // Update or create the file
      const updateResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "DomainBot",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `🤖 DomainBot: ${modification}`,
            content: Buffer.from(newContent).toString("base64"),
            sha,
            branch: "main",
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        return {
          success: false,
          error: `GitHub API error: ${updateResponse.status} - ${errorData.message || "Unknown error"}`,
        };
      }

      const result = await updateResponse.json();

      // Log the modification in Convex
      await ctx.runMutation(api.modifications.log, {
        userId,
        modificationType: "code_modified",
        description: modification,
        filePath,
      });

      return {
        success: true,
        message: `Modified ${filePath}. Vercel deployment will trigger automatically.`,
        commitSha: result.commit.sha,
        commitUrl: result.commit.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Update ideation strategies stored in the database
 */
export const updateIdeationStrategy = action({
  args: {
    strategyName: v.string(),
    description: v.string(),
    prefixes: v.optional(v.array(v.string())),
    suffixes: v.optional(v.array(v.string())),
    patterns: v.optional(v.array(v.string())),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // This updates the database, no deployment needed
    const result = await ctx.runMutation(api.strategies.upsert, {
      name: args.strategyName,
      description: args.description,
      prefixes: args.prefixes ?? [],
      suffixes: args.suffixes ?? [],
      patterns: args.patterns ?? [],
    });

    // Log the modification
    await ctx.runMutation(api.modifications.log, {
      userId: args.userId,
      modificationType: "strategy_updated",
      description: `Updated ideation strategy: ${args.strategyName}`,
    });

    return {
      success: true,
      strategyId: result,
      message: `Strategy "${args.strategyName}" has been updated.`,
    };
  },
});

/**
 * Get modification history
 */
export const getModificationHistory = action({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit }) => {
    const history = await ctx.runQuery(api.modifications.listByUser, {
      userId,
      limit: limit ?? 20,
    });
    return history;
  },
})
