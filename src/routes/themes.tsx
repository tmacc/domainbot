import { createFileRoute, Link } from "@tanstack/react-router";
import { Palette, Check, Plus, ArrowLeft } from "lucide-react";

import { cn } from "../lib/utils";
import { useTheme, type Theme } from "../lib/theme-context";

export const Route = createFileRoute("/themes")({
  component: ThemesPage,
});

function ThemesPage(): JSX.Element {
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-surface/50 px-6 py-4">
        <Link
          to="/"
          className="flex h-8 w-8 items-center justify-center rounded-default text-text-secondary hover:bg-background hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Palette className="h-5 w-5 text-primary" />
            Themes
          </h1>
          <p className="text-sm text-text-secondary">
            {themes.length} themes available
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Theme Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {themes.map((t) => (
              <ThemeCard
                key={t.slug}
                theme={t}
                isActive={theme === t.slug}
                onSelect={() => setTheme(t.slug)}
              />
            ))}

            {/* Create New Theme Card */}
            <Link
              to="/"
              className={cn(
                "flex min-h-[200px] flex-col items-center justify-center gap-3",
                "rounded-xl border-2 border-dashed border-border p-6",
                "text-text-secondary transition-all",
                "hover:border-primary hover:text-primary"
              )}
            >
              <Plus className="h-8 w-8" />
              <div className="text-center">
                <p className="font-medium">Create Custom Theme</p>
                <p className="text-sm opacity-70">
                  Ask the AI to design a new theme
                </p>
              </div>
            </Link>
          </div>

          {/* Theme Creation Hint */}
          <div className="mt-6 rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-2 font-semibold">Pro tip: AI-Generated Themes</h2>
            <p className="mb-4 text-sm text-text-secondary">
              Ask DomainBot to create custom themes! Try prompts like:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Create a dark forest theme",
                "Make a 90s web vibe",
                "Design a minimal monochrome theme",
                "Create a sunset beach theme",
              ].map((prompt) => (
                <Link
                  key={prompt}
                  to="/"
                  className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/20"
                >
                  &quot;{prompt}&quot;
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThemeCardProps {
  theme: Theme;
  isActive: boolean;
  onSelect: () => void;
}

function ThemeCard({ theme, isActive, onSelect }: ThemeCardProps): JSX.Element {
  const vars = theme.variables;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 text-left transition-all",
        isActive
          ? "border-primary shadow-default"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Theme Preview */}
      <div
        className="p-4"
        style={{
          backgroundColor: vars.colorBackground,
          color: vars.colorText,
        }}
      >
        {/* Preview Header */}
        <div
          className="mb-3 flex items-center gap-2 rounded p-2"
          style={{ backgroundColor: vars.colorSurface }}
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: vars.colorPrimary }}
          />
          <div
            className="h-2 flex-1 rounded"
            style={{ backgroundColor: vars.colorTextSecondary, opacity: 0.3 }}
          />
        </div>

        {/* Preview Content */}
        <div className="mb-3 space-y-2">
          <div
            className="h-2 w-3/4 rounded"
            style={{ backgroundColor: vars.colorText, opacity: 0.8 }}
          />
          <div
            className="h-2 w-1/2 rounded"
            style={{ backgroundColor: vars.colorTextSecondary, opacity: 0.5 }}
          />
        </div>

        {/* Preview Button */}
        <div
          className="inline-block rounded px-3 py-1 text-xs text-white"
          style={{
            backgroundColor: vars.colorPrimary,
            borderRadius: vars.borderRadius,
          }}
        >
          Button
        </div>

        {/* Color Swatches */}
        <div className="mt-4 flex gap-1">
          {[
            vars.colorPrimary,
            vars.colorSecondary,
            vars.colorAccent,
            vars.colorText,
          ].map((color, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-full border border-white/20"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Theme Info */}
      <div className="border-t border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{theme.name}</h3>
            <p className="text-sm text-text-secondary">{theme.description}</p>
          </div>
          {isActive && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
              <Check className="h-4 w-4" />
            </div>
          )}
        </div>
        {theme.isBuiltIn && (
          <span className="mt-2 inline-block rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
            Built-in
          </span>
        )}
      </div>
    </button>
  );
}
