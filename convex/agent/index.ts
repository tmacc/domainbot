import { Agent } from "@convex-dev/agent";
import { components } from "../_generated/api";
import { SYSTEM_PROMPT } from "./prompts";

// Note: The actual agent definition requires the Convex Agent component
// to be properly initialized. This file provides the structure.

// Agent configuration
export const AGENT_CONFIG = {
  name: "DomainBot",
  description: "AI-powered domain name discovery assistant",
  systemPrompt: SYSTEM_PROMPT,
  maxSteps: 10,

  // Default model configuration
  defaultModel: {
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
  },

  // Available tools
  tools: [
    // Domain tools
    "generateDomainNames",
    "checkDomainAvailability",
    "saveDomain",
    "getSavedDomains",
    "removeSavedDomain",

    // Theme tools
    "createTheme",
    "listThemes",
    "applyTheme",
    "getActiveTheme",

    // Self-modification tools
    "listModifiableFiles",
    "readSourceFile",
    "modifySourceFile",
    "updateIdeationStrategy",
    "getModificationHistory",
  ],
};

// Export for use in Convex functions
export { SYSTEM_PROMPT };

// Model options available via Vercel AI Gateway
export const AVAILABLE_MODELS = [
  {
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet",
    isDefault: true,
  },
  {
    provider: "anthropic",
    modelId: "claude-3-opus-20240229",
    displayName: "Claude 3 Opus",
    isDefault: false,
  },
  {
    provider: "openai",
    modelId: "gpt-4o",
    displayName: "GPT-4o",
    isDefault: false,
  },
  {
    provider: "openai",
    modelId: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    isDefault: false,
  },
  {
    provider: "google",
    modelId: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    isDefault: false,
  },
];
