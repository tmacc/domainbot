import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// GoDaddy API configuration
const GODADDY_API_URL = "https://api.godaddy.com/v1/domains/available";

interface DomainCheckResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: number;
  errorMessage?: string;
}

/**
 * Check domain availability via GoDaddy API
 * Uses mock data if API credentials are not configured
 */
export const checkDomains = action({
  args: {
    domains: v.array(v.string()),
  },
  handler: async (_ctx, { domains }): Promise<DomainCheckResult[]> => {
    const apiKey = process.env.GODADDY_API_KEY;
    const apiSecret = process.env.GODADDY_API_SECRET;

    // If no API credentials, use mock mode
    if (!apiKey || !apiSecret) {
      console.log("GoDaddy API not configured, using mock mode");
      return mockDomainAvailability(domains);
    }

    try {
      return await checkDomainsWithGoDaddy(domains, apiKey, apiSecret);
    } catch (error) {
      console.error("GoDaddy API error, falling back to mock:", error);
      return mockDomainAvailability(domains);
    }
  },
});

async function checkDomainsWithGoDaddy(
  domains: string[],
  apiKey: string,
  apiSecret: string
): Promise<DomainCheckResult[]> {
  const results: DomainCheckResult[] = [];

  // GoDaddy's bulk check endpoint or check individually
  // For production, we check each domain individually to get accurate pricing
  for (const domain of domains) {
    try {
      const response = await fetch(`${GODADDY_API_URL}?domain=${encodeURIComponent(domain)}`, {
        method: "GET",
        headers: {
          "Authorization": `sso-key ${apiKey}:${apiSecret}`,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        // Rate limited or other error - mark as unknown
        if (response.status === 429) {
          console.log(`Rate limited on ${domain}, waiting...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Retry once
          const retryResponse = await fetch(`${GODADDY_API_URL}?domain=${encodeURIComponent(domain)}`, {
            method: "GET",
            headers: {
              "Authorization": `sso-key ${apiKey}:${apiSecret}`,
              "Accept": "application/json",
            },
          });
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            results.push(parseGoDaddyResult(domain, data));
            continue;
          }
        }
        results.push({
          domain,
          available: false,
          premium: false,
          errorMessage: `API error: ${response.status}`,
        });
        continue;
      }

      const data = await response.json();
      results.push(parseGoDaddyResult(domain, data));

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({
        domain,
        available: false,
        premium: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

function parseGoDaddyResult(domain: string, data: {
  available?: boolean;
  definitive?: boolean;
  price?: number;
  currency?: string;
}): DomainCheckResult {
  // GoDaddy returns: { available, definitive, domain, price, currency }
  const available = data.available === true;
  const price = data.price ? data.price / 1000000 : undefined; // GoDaddy returns price in micros

  // Consider premium if price is significantly higher than standard (~$12)
  const premium = available && price !== undefined && price > 50;

  return {
    domain,
    available,
    premium,
    price: premium ? price : undefined,
  };
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

// Vercel AI Gateway configuration
const VERCEL_AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";

/**
 * Generate AI response using Vercel AI Gateway (Claude)
 * Falls back to simple template response if API not configured
 */
export const generateAIResponse = action({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
  },
  handler: async (ctx, { threadId, userMessage }) => {
    const aiGatewayKey = process.env.VERCEL_AI_GATEWAY_KEY;

    // Generate domain suggestions - either via Claude or basic algorithm
    let domainSuggestions: string[];
    let thinkingResponse: string;

    if (aiGatewayKey) {
      // Use Claude via Vercel AI Gateway to generate creative domain suggestions
      const claudeResult = await generateWithVercelAIGateway(userMessage, aiGatewayKey);
      domainSuggestions = claudeResult.suggestions;
      thinkingResponse = claudeResult.thinking;
    } else {
      // Fallback to basic algorithm
      console.log("VERCEL_AI_GATEWAY_KEY not configured, using basic domain generation");
      domainSuggestions = generateDomainSuggestions(userMessage);
      thinkingResponse = `Great! "${userMessage}" sounds like an exciting project! Let me brainstorm some domain names and check their availability...\n\nI'm looking for names that are:\n- Memorable and brandable\n- Available across popular TLDs\n- Related to your project concept`;
    }

    // Check domain availability via GoDaddy
    const domainResults = await ctx.runAction(api.actions.checkDomains, {
      domains: domainSuggestions,
    });

    const availableCount = domainResults.filter((r) => r.available).length;

    // Generate results summary
    let resultsResponse: string;
    if (aiGatewayKey) {
      resultsResponse = await generateResultsSummary(domainResults, userMessage, aiGatewayKey);
    } else {
      resultsResponse = `I found ${availableCount} available domains out of ${domainResults.length} checked! Here are the results:`;
    }

    return {
      thinking: thinkingResponse,
      results: resultsResponse,
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
 * Call Claude via Vercel AI Gateway to generate creative domain suggestions
 */
async function generateWithVercelAIGateway(
  projectIdea: string,
  apiKey: string
): Promise<{ suggestions: string[]; thinking: string }> {
  const systemPrompt = `You are DomainBot, a creative domain name discovery assistant.
Your job is to help users find perfect domain names for their projects.

When given a project description, you should:
1. Extract key concepts and keywords
2. Generate creative, memorable domain names using strategies like:
   - Combining words creatively
   - Using prefixes (get, my, try, use, go, hey)
   - Using suffixes (app, hq, hub, ly, ify)
   - Wordplay, alliteration, and rhymes
   - Short memorable names
3. Consider multiple TLDs: .com, .io, .co, .dev, .app, .ai

Respond with a JSON object containing:
- "thinking": A brief explanation of your creative process (2-3 sentences)
- "suggestions": An array of 10-15 full domain names (e.g., "coolapp.io", "myproject.com")

Important: Only output valid JSON, no markdown formatting.`;

  try {
    const response = await fetch(VERCEL_AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-sonnet",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Help me find domain names for this project: ${projectIdea}`,
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vercel AI Gateway error:", response.status, errorText);
      throw new Error(`Vercel AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        thinking: parsed.thinking || "Let me find some creative domain names for you...",
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 15) : generateDomainSuggestions(projectIdea),
      };
    } catch (parseError) {
      console.error("Failed to parse Claude response:", parseError);
      return {
        thinking: content.slice(0, 300),
        suggestions: generateDomainSuggestions(projectIdea),
      };
    }
  } catch (error) {
    console.error("Vercel AI Gateway call failed:", error);
    return {
      thinking: `Great! "${projectIdea}" sounds like an exciting project! Let me brainstorm some domain names...`,
      suggestions: generateDomainSuggestions(projectIdea),
    };
  }
}

/**
 * Generate a summary of domain results using Claude via Vercel AI Gateway
 */
async function generateResultsSummary(
  results: DomainCheckResult[],
  projectIdea: string,
  apiKey: string
): Promise<string> {
  const availableCount = results.filter((r) => r.available).length;
  const availableDomains = results.filter((r) => r.available).map((r) => r.domain);
  const premiumDomains = results.filter((r) => r.premium).map((r) => `${r.domain} ($${r.price})`);

  try {
    const response = await fetch(VERCEL_AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-5-sonnet",
        messages: [
          {
            role: "user",
            content: `The user is looking for domains for: "${projectIdea}"

I checked ${results.length} domains and found ${availableCount} available.
Available domains: ${availableDomains.join(", ") || "none"}
Premium domains: ${premiumDomains.join(", ") || "none"}

Write a brief, friendly 1-2 sentence summary of the results. Be encouraging and highlight the best options if any are available. Don't use bullet points, just plain text.`,
          },
        ],
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vercel AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `I found ${availableCount} available domains out of ${results.length} checked!`;
  } catch (error) {
    console.error("Failed to generate results summary:", error);
    return `I found ${availableCount} available domains out of ${results.length} checked! Here are the results:`;
  }
}

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
