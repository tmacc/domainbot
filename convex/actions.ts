import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { domainBot } from "./agent";

// GoDaddy API configuration
const GODADDY_API_URL = "https://api.godaddy.com/v1/domains/available";

// Concurrency control for parallel requests
const MAX_CONCURRENT_REQUESTS = 5;
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 300;
const SINGLE_DOMAIN_TIMEOUT_MS = 5000; // 5 second timeout per domain

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: number;
  errorMessage?: string;
}

/**
 * Sleep helper for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SINGLE_DOMAIN_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.name === "AbortError") {
        console.log(`Request timed out after ${SINGLE_DOMAIN_TIMEOUT_MS}ms`);
        break; // Don't retry on timeout
      }
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.log(`Request failed, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

/**
 * Process items in parallel with concurrency limit
 */
async function parallelMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

/**
 * Check domain availability via GoDaddy API (internal - called by agent tools)
 */
export const checkDomains = internalAction({
  args: {
    domains: v.array(v.string()),
  },
  handler: async (_ctx, { domains }): Promise<DomainCheckResult[]> => {
    // Limit to 8 domains max to prevent long wait times
    const domainsToCheck = domains.slice(0, 8);
    console.log(`Checking ${domainsToCheck.length} domains (of ${domains.length} requested)`);

    const apiKey = process.env.GODADDY_API_KEY;
    const apiSecret = process.env.GODADDY_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.log("GoDaddy API not configured, using mock mode");
      return mockDomainAvailability(domainsToCheck);
    }

    try {
      return await checkDomainsWithGoDaddy(domainsToCheck, apiKey, apiSecret);
    } catch (error) {
      console.error("GoDaddy API error, falling back to mock:", error);
      return mockDomainAvailability(domainsToCheck);
    }
  },
});

async function checkDomainsWithGoDaddy(
  domains: string[],
  apiKey: string,
  apiSecret: string
): Promise<DomainCheckResult[]> {
  const checkSingleDomain = async (domain: string): Promise<DomainCheckResult> => {
    try {
      const response = await fetchWithRetry(
        `${GODADDY_API_URL}?domain=${encodeURIComponent(domain)}`,
        {
          method: "GET",
          headers: {
            Authorization: `sso-key ${apiKey}:${apiSecret}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        return {
          domain,
          available: false,
          premium: false,
          errorMessage: `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return parseGoDaddyResult(domain, data);
    } catch (error) {
      return {
        domain,
        available: false,
        premium: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  return parallelMap(domains, checkSingleDomain, MAX_CONCURRENT_REQUESTS);
}

function parseGoDaddyResult(
  domain: string,
  data: {
    available?: boolean;
    definitive?: boolean;
    price?: number;
    currency?: string;
  }
): DomainCheckResult {
  const available = data.available === true;
  const price = data.price ? data.price / 1000000 : undefined;
  const premium = available && price !== undefined && price > 50;

  return {
    domain,
    available,
    premium,
    price: premium ? price : undefined,
  };
}

function mockDomainAvailability(domains: string[]): DomainCheckResult[] {
  return domains.map((domain) => {
    const name = domain.split(".")[0];
    const tld = domain.slice(domain.indexOf("."));

    const isLikelyTaken =
      name.length <= 4 ||
      (tld === ".com" && name.length <= 8) ||
      /^(get|my|the|go)[a-z]+$/.test(name);

    const isPremium = name.length <= 3 || /^[a-z]{4}$/.test(name);
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

// ============================================
// Agent Chat Action - uses Convex Agent plugin
// ============================================

/**
 * Send a message to the DomainBot agent and get a response
 * This uses the Convex Agent plugin for automatic context, tool handling, etc.
 */
export const chat = action({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { threadId, message }) => {
    // Use the agent to generate a response
    // The agent automatically:
    // - Includes conversation context
    // - Calls tools as needed (generateDomainNames, checkDomainAvailability, etc.)
    // - Saves messages to the thread
    const result = await domainBot.generateText(ctx, { threadId }, { prompt: message });

    // Collect all tool results from all steps (for multi-step tool calling)
    const allToolResults: Array<{
      toolCallId: string;
      toolName: string;
      result: unknown;
    }> = [];

    // Method 1: Check result.steps (AI SDK format)
    // Note: toolResults use 'output' not 'result', and toolName is index-based ("0", "1")
    type StepToolResult = {
      toolCallId: string;
      toolName: string;
      output?: unknown;  // AI SDK uses 'output'
      result?: unknown;  // Fallback
      input?: unknown;
    };
    const resultWithSteps = result as { steps?: Array<{ toolResults?: StepToolResult[] }> };
    if (resultWithSteps.steps) {
      for (const step of resultWithSteps.steps) {
        if (step.toolResults && step.toolResults.length > 0) {
          for (const tr of step.toolResults) {
            // Use 'output' (AI SDK) or 'result' as fallback
            const resultData = tr.output ?? tr.result;
            if (resultData !== undefined) {
              // Map tool index to tool name
              const toolNameMap: Record<string, string> = {
                "0": "generateDomainNames",
                "1": "checkDomainAvailability",
                "2": "saveDomain",
                "3": "getSavedDomains"
              };
              allToolResults.push({
                toolCallId: tr.toolCallId,
                toolName: toolNameMap[tr.toolName] ?? tr.toolName,
                result: resultData,
              });
            }
          }
        }
      }
    }

    // Method 2: Check result.toolResults directly (usually empty with multi-step)
    // Skip if we already got results from steps
    if (result.toolResults && result.toolResults.length > 0 && allToolResults.length === 0) {
      for (const tr of result.toolResults) {
        const toolResult = tr as Record<string, unknown>;
        if (!allToolResults.some((r) => r.toolCallId === toolResult.toolCallId)) {
          allToolResults.push({
            toolCallId: (toolResult.toolCallId ?? "") as string,
            toolName: (toolResult.toolName ?? "unknown") as string,
            result: toolResult.output ?? toolResult.result,
          });
        }
      }
    }

    // Method 3: Check response.messages for tool messages (fallback)
    const resultWithResponse = result as { response?: { messages?: Array<{ role: string; content?: Array<{ type: string; toolCallId?: string; toolName?: string; result?: unknown }> }> } };
    if (resultWithResponse.response?.messages) {
      for (const msg of resultWithResponse.response.messages) {
        if (msg.role === "tool" && msg.content) {
          for (const part of msg.content) {
            if (part.type === "tool-result" && part.toolCallId && part.result !== undefined) {
              if (!allToolResults.some((r) => r.toolCallId === part.toolCallId)) {
                allToolResults.push({
                  toolCallId: part.toolCallId,
                  toolName: part.toolName || "unknown",
                  result: part.result,
                });
              }
            }
          }
        }
      }
    }

    return {
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: allToolResults,
    };
  },
});

/**
 * Create a new thread for the agent
 */
export const createThread = action({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title }) => {
    const { threadId } = await domainBot.createThread(ctx, {
      metadata: { userId, title: title ?? "New conversation" },
    });
    return threadId;
  },
});

/**
 * Legacy generateAIResponse - redirects to new chat action
 * Kept for backwards compatibility during migration
 */
export const generateAIResponse = action({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
  },
  handler: async (ctx, { threadId, userMessage }) => {
    // Call the new chat action
    const result = await ctx.runAction(internal.actions.chatInternal, {
      threadId: threadId.toString(),
      message: userMessage,
    });

    // Format response for backwards compatibility
    return {
      thinking: "Let me help you find some domain names...",
      results: result.text,
      domainResults: result.toolResults?.[0]?.result ?? [],
      toolCalls: result.toolCalls ?? [],
    };
  },
});

// Internal version of chat for legacy support
export const chatInternal = internalAction({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, { threadId, message }) => {
    const result = await domainBot.generateText(ctx, { threadId }, { prompt: message });

    // Collect all tool results from all steps
    const allToolResults: Array<{
      toolCallId: string;
      toolName: string;
      result: unknown;
    }> = [];

    if (result.steps) {
      for (const step of result.steps) {
        if (step.toolResults) {
          for (const tr of step.toolResults) {
            allToolResults.push({
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              result: tr.result,
            });
          }
        }
      }
    }

    return {
      text: result.text,
      toolCalls: result.toolCalls,
      toolResults: allToolResults,
    };
  },
});
