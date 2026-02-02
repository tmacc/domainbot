import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  Plus,
  Bookmark,
  Palette,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

import { cn } from "../../lib/utils";
import { useTheme } from "../../lib/theme-context";
import { useUser } from "../../lib/user-context";

interface Conversation {
  id: string;
  title: string;
  timestamp: number;
  preview?: string;
}

interface SidebarProps {
  currentConversationId?: string;
  onNewChat: () => void;
  onSelectConversation?: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  currentConversationId,
  onNewChat,
  onSelectConversation,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps): JSX.Element {
  const { theme, setTheme, themes } = useTheme();
  const { userId } = useUser();

  // Fetch real conversations from Convex
  const threads = useQuery(
    api.threads.listByUser,
    userId ? { userId } : "skip"
  );

  // Convert to Conversation format
  const conversations: Conversation[] = (threads ?? []).map((t) => ({
    id: t._id,
    title: t.title,
    timestamp: t.updatedAt,
  }));

  const groupedConversations = groupConversationsByDate(conversations);

  if (collapsed) {
    return (
      <aside className="flex h-full w-16 flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center justify-center border-b border-border">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-default p-2 text-text-secondary hover:bg-background hover:text-text"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 p-2">
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-10 w-10 items-center justify-center rounded-default bg-primary text-white hover:bg-secondary"
            title="New Chat"
          >
            <Plus className="h-5 w-5" />
          </button>

          <div className="my-2 h-px w-8 bg-border" />

          <Link
            to="/saved"
            className="flex h-10 w-10 items-center justify-center rounded-default text-text-secondary hover:bg-background hover:text-text"
            title="Saved Domains"
          >
            <Bookmark className="h-5 w-5" />
          </Link>

          <Link
            to="/themes"
            className="flex h-10 w-10 items-center justify-center rounded-default text-text-secondary hover:bg-background hover:text-text"
            title="Themes"
          >
            <Palette className="h-5 w-5" />
          </Link>
        </div>

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => {
              const currentIndex = themes.findIndex((t) => t.slug === theme);
              const nextIndex = (currentIndex + 1) % themes.length;
              setTheme(themes[nextIndex].slug);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-default text-text-secondary hover:bg-background hover:text-text"
            title={`Theme: ${themes.find((t) => t.slug === theme)?.name}`}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <span className="font-semibold text-text">Conversations</span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded-default p-1.5 text-text-secondary hover:bg-background hover:text-text"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNewChat}
          className={cn(
            "flex w-full items-center gap-2 rounded-default px-3 py-2.5",
            "border border-dashed border-border",
            "text-text-secondary transition-all",
            "hover:border-primary hover:bg-primary/5 hover:text-primary"
          )}
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">New Chat</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3">
        {Object.keys(groupedConversations).length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-text-secondary">
            No conversations yet.
            <br />
            Start a new chat!
          </div>
        ) : (
          Object.entries(groupedConversations).map(([group, convos]) => (
            <div key={group} className="mb-4">
              <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
                {group}
              </h3>
              <div className="space-y-1">
                {convos.map((convo) => (
                  <button
                    key={convo.id}
                    type="button"
                    onClick={() => onSelectConversation?.(convo.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-default px-2 py-2 text-left",
                      "transition-colors",
                      currentConversationId === convo.id
                        ? "bg-primary/10 text-primary"
                        : "text-text hover:bg-background"
                    )}
                  >
                    <MessageSquare className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{convo.title}</p>
                      {convo.preview && (
                        <p className="truncate text-xs text-text-secondary">
                          {convo.preview}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Links */}
      <div className="border-t border-border p-3">
        <div className="space-y-1">
          <Link
            to="/saved"
            className={cn(
              "flex items-center gap-2 rounded-default px-2 py-2",
              "text-sm text-text-secondary transition-colors",
              "hover:bg-background hover:text-text"
            )}
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved Domains</span>
          </Link>
          <Link
            to="/themes"
            className={cn(
              "flex items-center gap-2 rounded-default px-2 py-2",
              "text-sm text-text-secondary transition-colors",
              "hover:bg-background hover:text-text"
            )}
          >
            <Palette className="h-4 w-4" />
            <span>Themes</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              const currentIndex = themes.findIndex((t) => t.slug === theme);
              const nextIndex = (currentIndex + 1) % themes.length;
              setTheme(themes[nextIndex].slug);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-default px-2 py-2",
              "text-sm text-text-secondary transition-colors",
              "hover:bg-background hover:text-text"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Theme: {themes.find((t) => t.slug === theme)?.name}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function groupConversationsByDate(
  conversations: Conversation[]
): Record<string, Conversation[]> {
  const today = new Date().setHours(0, 0, 0, 0);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const weekAgo = today - 7 * 24 * 60 * 60 * 1000;

  const groups: Record<string, Conversation[]> = {};

  for (const convo of conversations) {
    let group: string;
    if (convo.timestamp >= today) {
      group = "Today";
    } else if (convo.timestamp >= yesterday) {
      group = "Yesterday";
    } else if (convo.timestamp >= weekAgo) {
      group = "This Week";
    } else {
      group = "Older";
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(convo);
  }

  return groups;
}
