import { XMLParser } from "fast-xml-parser";

const NAMECHEAP_API_URL = "https://api.namecheap.com/xml.response";

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  premium: boolean;
  price?: number;
  errorMessage?: string;
}

interface NamecheapConfig {
  apiUser: string;
  apiKey: string;
  userName: string;
  clientIp: string;
}

/**
 * Check domain availability via Namecheap API
 */
export async function checkDomainAvailability(
  domains: string[],
  config: NamecheapConfig
): Promise<DomainCheckResult[]> {
  // Namecheap limits to 50 domains per request
  const MAX_DOMAINS_PER_REQUEST = 50;

  if (domains.length > MAX_DOMAINS_PER_REQUEST) {
    // Split into batches
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
  config: NamecheapConfig
): Promise<DomainCheckResult[]> {
  const params = new URLSearchParams({
    ApiUser: config.apiUser,
    ApiKey: config.apiKey,
    UserName: config.userName,
    Command: "namecheap.domains.check",
    ClientIp: config.clientIp,
    DomainList: domains.join(","),
  });

  try {
    const response = await fetch(`${NAMECHEAP_API_URL}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Namecheap API error: ${response.status}`);
    }

    const xmlText = await response.text();
    return parseNamecheapResponse(xmlText);
  } catch (error) {
    console.error("Domain availability check failed:", error);

    // Return error results for all domains
    return domains.map((domain) => ({
      domain,
      available: false,
      premium: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    }));
  }
}

function parseNamecheapResponse(xmlText: string): DomainCheckResult[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });

  const result = parser.parse(xmlText);

  // Check for API errors
  if (result.ApiResponse?.Errors?.Error) {
    const error = result.ApiResponse.Errors.Error;
    throw new Error(error["#text"] || "Namecheap API error");
  }

  const domainResults = result.ApiResponse?.CommandResponse?.DomainCheckResult;

  if (!domainResults) {
    return [];
  }

  // Handle single result vs array
  const results = Array.isArray(domainResults) ? domainResults : [domainResults];

  return results.map((r: Record<string, string>) => ({
    domain: r.Domain,
    available: r.Available === "true",
    premium: r.IsPremiumName === "true",
    price: r.PremiumRegistrationPrice
      ? Number.parseFloat(r.PremiumRegistrationPrice)
      : undefined,
  }));
}

/**
 * Mock domain availability for development/testing
 * Returns semi-realistic availability based on domain characteristics
 */
export function mockDomainAvailability(domains: string[]): DomainCheckResult[] {
  return domains.map((domain) => {
    // Simulate availability based on some heuristics
    const name = domain.split(".")[0];
    const tld = domain.slice(domain.indexOf("."));

    // Short names and .com are usually taken
    const isLikelyTaken =
      name.length <= 4 ||
      (tld === ".com" && name.length <= 8) ||
      /^(get|my|the|go)[a-z]+$/.test(name);

    // Premium domains
    const isPremium = name.length <= 3 || /^[a-z]{4}$/.test(name);

    // Random factor (seeded by domain name)
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
