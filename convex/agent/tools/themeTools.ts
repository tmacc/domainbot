import { z } from "zod";

// Theme variable schema
export const themeVariablesSchema = z.object({
  colorPrimary: z.string().describe("Primary brand color (hex)"),
  colorSecondary: z.string().describe("Secondary color (hex)"),
  colorAccent: z.string().describe("Accent/highlight color (hex)"),
  colorBackground: z.string().describe("Page background color (hex)"),
  colorSurface: z.string().describe("Card/surface background color (hex)"),
  colorText: z.string().describe("Primary text color (hex)"),
  colorTextSecondary: z.string().describe("Secondary/muted text color (hex)"),
  fontFamilySans: z.string().describe("Sans-serif font family CSS value"),
  fontFamilyMono: z.string().describe("Monospace font family CSS value"),
  borderRadius: z.string().describe("Border radius value (e.g., '0.5rem', '0')"),
  shadowStyle: z.string().describe("Box shadow CSS value"),
});

// Tool schemas for Convex Agent
export const themeToolSchemas = {
  createTheme: {
    description:
      "Create a new visual theme based on a description. Generate colors, fonts, and styling that match the user's vision.",
    parameters: z.object({
      name: z.string().describe("Display name for the theme"),
      description: z.string().describe("Brief description of the theme aesthetic"),
      inspiration: z.string().describe("What the theme should look/feel like"),
      variables: themeVariablesSchema.describe("The theme's visual properties"),
      customCSS: z
        .string()
        .optional()
        .describe("Optional additional CSS for special effects"),
    }),
  },

  listThemes: {
    description: "List all available themes (built-in and custom)",
    parameters: z.object({}),
  },

  applyTheme: {
    description: "Switch the application to a different theme",
    parameters: z.object({
      themeSlug: z.string().describe("The slug/identifier of the theme to apply"),
    }),
  },

  getActiveTheme: {
    description: "Get information about the currently active theme",
    parameters: z.object({}),
  },

  deleteTheme: {
    description: "Delete a custom theme (cannot delete built-in themes)",
    parameters: z.object({
      themeSlug: z.string().describe("The slug of the theme to delete"),
    }),
  },
};

// Helper to generate a theme based on a description
export function generateThemeFromDescription(
  inspiration: string
): z.infer<typeof themeVariablesSchema> {
  // This is a placeholder - the actual theme generation would be done by the LLM
  // based on the inspiration string. The LLM would output the actual values.

  // Default fallback theme (Claude-like)
  return {
    colorPrimary: "#5a3dc9",
    colorSecondary: "#7c5cdb",
    colorAccent: "#00d4aa",
    colorBackground: "#ffffff",
    colorSurface: "#f7f7f8",
    colorText: "#1a1a1a",
    colorTextSecondary: "#6b6b6b",
    fontFamilySans: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFamilyMono: '"SF Mono", Consolas, monospace',
    borderRadius: "0.5rem",
    shadowStyle: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  };
}
