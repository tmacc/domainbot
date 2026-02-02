import { z } from "zod";

// Whitelist of files the agent is allowed to modify
export const MODIFIABLE_FILES = {
  components: [
    "src/components/ui/Button.tsx",
    "src/components/ui/Card.tsx",
    "src/components/ui/Input.tsx",
    "src/components/chat/MessageBubble.tsx",
    "src/components/domains/DomainCard.tsx",
  ],
  styles: [
    "src/styles.css",
  ],
  // Agent CANNOT modify: auth, database schema, agent tools (safety)
  forbidden: [
    "convex/schema.ts",
    "convex/auth.ts",
    "convex/agent/**",
    "src/lib/auth.ts",
  ],
};

// Tool schemas for Convex Agent
export const selfModifyToolSchemas = {
  listModifiableFiles: {
    description:
      "List the files that the agent is allowed to modify. Use this before attempting any modifications.",
    parameters: z.object({}),
  },

  readSourceFile: {
    description: "Read the current contents of a source file from the repository",
    parameters: z.object({
      filePath: z.string().describe("Path relative to repo root (e.g., 'src/components/ui/Button.tsx')"),
    }),
  },

  modifySourceFile: {
    description:
      "Modify a UI component or style file and deploy via git commit. Only works on whitelisted files.",
    parameters: z.object({
      filePath: z.string().describe("Path relative to repo root"),
      modification: z.string().describe("Description of what is being changed and why"),
      newContent: z.string().describe("The complete new file content"),
    }),
  },

  updateIdeationStrategy: {
    description:
      "Add or modify domain name generation strategies (prefixes, suffixes, patterns)",
    parameters: z.object({
      strategyName: z.string().describe("Name of the strategy to update or create"),
      description: z.string().describe("What this strategy does"),
      prefixes: z.array(z.string()).optional().describe("List of prefixes to add/use"),
      suffixes: z.array(z.string()).optional().describe("List of suffixes to add/use"),
      patterns: z
        .array(z.string())
        .optional()
        .describe("Patterns like '{keyword}app' or 'get{keyword}'"),
    }),
  },

  getModificationHistory: {
    description: "Get the history of modifications made by the agent",
    parameters: z.object({
      limit: z.number().optional().describe("Maximum number of entries to return"),
    }),
  },
};

// Check if a file path is allowed to be modified
export function isFileModifiable(filePath: string): boolean {
  // Check against forbidden paths
  for (const forbidden of MODIFIABLE_FILES.forbidden) {
    if (forbidden.includes("**")) {
      const prefix = forbidden.replace("/**", "");
      if (filePath.startsWith(prefix)) {
        return false;
      }
    } else if (filePath === forbidden) {
      return false;
    }
  }

  // Check against allowed paths
  const allAllowed = [...MODIFIABLE_FILES.components, ...MODIFIABLE_FILES.styles];

  return allAllowed.includes(filePath);
}
