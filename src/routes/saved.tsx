import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, ExternalLink, Trash2, Check, X, ArrowLeft } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

import { cn } from "../lib/utils";
import { useUser } from "../lib/user-context";

export const Route = createFileRoute("/saved")({
  component: SavedDomainsPage,
});

function SavedDomainsPage(): JSX.Element {
  const { userId, isLoading: userLoading } = useUser();

  // Fetch saved domains from Convex
  const savedDomains = useQuery(
    api.domains.listByUser,
    userId ? { userId } : "skip"
  );

  const removeDomain = useMutation(api.domains.remove);

  const handleRemove = async (domainId: Id<"savedDomains">): Promise<void> => {
    await removeDomain({ domainId });
  };

  if (userLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

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
            <Bookmark className="h-5 w-5 text-primary" />
            Saved Domains
          </h1>
          <p className="text-sm text-text-secondary">
            {savedDomains?.length ?? 0} domains saved
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          {!savedDomains || savedDomains.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {savedDomains.map((domain) => (
                <DomainCard
                  key={domain._id}
                  domain={domain}
                  onRemove={() => handleRemove(domain._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DomainCardProps {
  domain: {
    _id: Id<"savedDomains">;
    domain: string;
    tld: string;
    available: boolean;
    checkedAt: number;
    projectIdea?: string;
    notes?: string;
  };
  onRemove: () => void;
}

function DomainCard({ domain, onRemove }: DomainCardProps): JSX.Element {
  const timeAgo = formatTimeAgo(domain.checkedAt);

  return (
    <div
      className={cn(
        "group rounded-xl border border-border bg-surface p-4",
        "transition-all hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5 flex items-center gap-3">
            <h3 className="truncate text-base font-semibold">{domain.domain}</h3>
            <span
              className={cn(
                "flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                domain.available
                  ? "bg-success/10 text-success"
                  : "bg-error/10 text-error"
              )}
            >
              {domain.available ? (
                <>
                  <Check className="h-3 w-3" /> Available
                </>
              ) : (
                <>
                  <X className="h-3 w-3" /> Taken
                </>
              )}
            </span>
          </div>

          <div className="space-y-1 text-sm text-text-secondary">
            {domain.projectIdea && (
              <p className="truncate">
                <span className="text-text-secondary/70">Project:</span> {domain.projectIdea}
              </p>
            )}
            {domain.notes && (
              <p className="truncate">
                <span className="text-text-secondary/70">Notes:</span> {domain.notes}
              </p>
            )}
            <p className="text-xs">Checked {timeAgo}</p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <a
            href={`https://www.namecheap.com/domains/registration/results/?domain=${domain.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "rounded-lg p-2 transition-colors",
              "text-text-secondary hover:bg-primary/10 hover:text-primary"
            )}
            title="Check on registrar"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              "rounded-lg p-2 transition-colors",
              "text-text-secondary hover:bg-error/10 hover:text-error"
            )}
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Bookmark className="h-6 w-6 text-primary" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No saved domains yet</h3>
      <p className="mb-4 text-center text-sm text-text-secondary">
        Start a conversation to discover domain names
        <br />
        and save your favorites here.
      </p>
      <Link
        to="/"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary"
      >
        Start Chatting
      </Link>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
