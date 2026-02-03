import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "./user-context";

// Theme variable types
export interface ThemeVariables {
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorSurface: string;
  colorText: string;
  colorTextSecondary: string;
  fontFamilySans: string;
  fontFamilyMono: string;
  borderRadius: string;
  shadowStyle: string;
}

export interface Theme {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isBuiltIn: boolean;
  variables: ThemeVariables;
  customCSS?: string;
}

interface ThemeContextValue {
  theme: string;
  setTheme: (theme: string) => void;
  themes: Theme[];
  currentThemeData: Theme | null;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Built-in themes (for offline/loading state)
const BUILT_IN_THEMES: Theme[] = [
  {
    _id: "claude",
    name: "Claude",
    slug: "claude",
    description: "Clean, modern design inspired by Anthropic",
    isBuiltIn: true,
    variables: {
      colorPrimary: "#5a3dc9",
      colorSecondary: "#7c5cdb",
      colorAccent: "#00d4aa",
      colorBackground: "#ffffff",
      colorSurface: "#f7f7f8",
      colorText: "#1a1a1a",
      colorTextSecondary: "#6b6b6b",
      fontFamilySans:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontFamilyMono: '"SF Mono", Consolas, monospace',
      borderRadius: "0.5rem",
      shadowStyle: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
  },
  {
    _id: "retro80s",
    name: "Retro 80s",
    slug: "retro80s",
    description: "Neon-lit 1980s computing aesthetic",
    isBuiltIn: true,
    variables: {
      colorPrimary: "#ff00ff",
      colorSecondary: "#00ffff",
      colorAccent: "#ffff00",
      colorBackground: "#0a0a0a",
      colorSurface: "#1a1a2e",
      colorText: "#00ff41",
      colorTextSecondary: "#00cccc",
      fontFamilySans: '"VT323", "Courier New", monospace',
      fontFamilyMono: '"VT323", monospace',
      borderRadius: "0",
      shadowStyle:
        "0 0 10px rgba(255, 0, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)",
    },
  },
];

const STORAGE_KEY = "domainbot-theme";

function applyThemeToDOM(themeSlug: string, themeData?: Theme): void {
  document.documentElement.setAttribute("data-theme", themeSlug);

  // Apply dynamic CSS variables for custom themes
  if (themeData && !themeData.isBuiltIn) {
    const root = document.documentElement;
    const vars = themeData.variables;

    root.style.setProperty("--theme-color-primary", vars.colorPrimary);
    root.style.setProperty("--theme-color-secondary", vars.colorSecondary);
    root.style.setProperty("--theme-color-accent", vars.colorAccent);
    root.style.setProperty("--theme-color-background", vars.colorBackground);
    root.style.setProperty("--theme-color-surface", vars.colorSurface);
    root.style.setProperty("--theme-color-text", vars.colorText);
    root.style.setProperty(
      "--theme-color-text-secondary",
      vars.colorTextSecondary
    );
    root.style.setProperty("--theme-font-sans", vars.fontFamilySans);
    root.style.setProperty("--theme-font-mono", vars.fontFamilyMono);
    root.style.setProperty("--theme-border-radius", vars.borderRadius);

    // Add custom CSS if provided
    if (themeData.customCSS) {
      let styleEl = document.getElementById("custom-theme-css");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "custom-theme-css";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = themeData.customCSS;
    }
  } else {
    // Remove custom CSS for built-in themes
    const styleEl = document.getElementById("custom-theme-css");
    if (styleEl) {
      styleEl.remove();
    }
    // Clear inline styles
    const root = document.documentElement;
    root.style.removeProperty("--theme-color-primary");
    root.style.removeProperty("--theme-color-secondary");
    root.style.removeProperty("--theme-color-accent");
    root.style.removeProperty("--theme-color-background");
    root.style.removeProperty("--theme-color-surface");
    root.style.removeProperty("--theme-color-text");
    root.style.removeProperty("--theme-color-text-secondary");
    root.style.removeProperty("--theme-font-sans");
    root.style.removeProperty("--theme-font-mono");
    root.style.removeProperty("--theme-border-radius");
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "claude",
}: ThemeProviderProps): JSX.Element {
  const themes = BUILT_IN_THEMES;
  const isLoading = false;
  const { userId } = useUser();

  // Convex mutation to persist theme selection
  const updateThemeMutation = useMutation(api.users.updateTheme);

  // Query user to get their saved theme preference
  const user = useQuery(
    api.users.getById,
    userId ? { userId } : "skip"
  );

  const [theme, setThemeState] = useState<string>(() => {
    // SSR-safe initialization
    if (typeof window === "undefined") return defaultTheme;
    return localStorage.getItem(STORAGE_KEY) || defaultTheme;
  });

  // Sync theme from Convex user record on initial load
  useEffect(() => {
    if (user?.selectedTheme && user.selectedTheme !== theme) {
      setThemeState(user.selectedTheme);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, user.selectedTheme);
      }
    }
  }, [user?.selectedTheme]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const themeData = themes.find((t) => t.slug === theme);
    applyThemeToDOM(theme, themeData);
  }, [theme, themes]);

  const setTheme = useCallback(
    (newTheme: string) => {
      setThemeState(newTheme);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newTheme);
      }
      // Persist to Convex if user is available
      if (userId) {
        updateThemeMutation({ userId, theme: newTheme }).catch((err) => {
          console.error("Failed to persist theme to Convex:", err);
        });
      }
    },
    [userId, updateThemeMutation]
  );

  const currentThemeData = themes.find((t) => t.slug === theme) || null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes,
        currentThemeData,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
