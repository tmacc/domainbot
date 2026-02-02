import { Link } from "@tanstack/react-router";
import { Globe, Moon, Sun, MessageSquare, Bookmark, Palette } from "lucide-react";

import { useTheme } from "../lib/theme-context";
import { cn } from "../lib/utils";

export function Header(): JSX.Element {
  const { theme, setTheme, themes } = useTheme();

  const toggleTheme = (): void => {
    const currentIndex = themes.findIndex((t) => t.slug === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].slug);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-xl font-bold text-primary transition-colors hover:text-secondary"
        >
          <Globe className="h-6 w-6" />
          <span>DomainBot</span>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1">
          <NavLink to="/" icon={<MessageSquare className="h-4 w-4" />}>
            Chat
          </NavLink>
          <NavLink to="/saved" icon={<Bookmark className="h-4 w-4" />}>
            Saved
          </NavLink>
          <NavLink to="/themes" icon={<Palette className="h-4 w-4" />}>
            Themes
          </NavLink>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-2 rounded-default px-3 py-2",
            "bg-primary/10 text-primary transition-all",
            "hover:bg-primary/20 hover:shadow-default"
          )}
          title={`Current theme: ${themes.find((t) => t.slug === theme)?.name}`}
        >
          {theme === "retro80s" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="hidden text-sm font-medium sm:inline">
            {themes.find((t) => t.slug === theme)?.name}
          </span>
        </button>
      </nav>
    </header>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function NavLink({ to, icon, children }: NavLinkProps): JSX.Element {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 rounded-default px-3 py-2",
        "text-text-secondary transition-colors",
        "hover:bg-surface hover:text-text",
        "[&.active]:bg-primary/10 [&.active]:text-primary"
      )}
      activeProps={{
        className: "active",
      }}
    >
      {icon}
      <span className="hidden font-medium sm:inline">{children}</span>
    </Link>
  );
}
