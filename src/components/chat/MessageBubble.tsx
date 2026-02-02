import { Globe, Check, X, ExternalLink, Bookmark, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Message, DomainResult } from "../../types/chat";

interface MessageBubbleProps {
  message: Message;
  onSaveDomain?: (domain: string) => void;
}

export function MessageBubble({ message, onSaveDomain }: MessageBubbleProps): JSX.Element {
  const isUser = message.role === "user";
  const isStreaming = message.streaming;

  return (
    <div
      className={cn(
        "mb-4 flex",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-white"
            : "border border-border bg-surface text-text"
        )}
      >
        {/* Assistant header */}
        {!isUser && (
          <div className="mb-2 flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">DomainBot</span>
            {isStreaming && (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            )}
          </div>
        )}

        {/* Message content */}
        <div className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary" />
            )}
          </p>

          {/* Domain results */}
          {message.domainResults && message.domainResults.length > 0 && (
            <DomainResultsList
              results={message.domainResults}
              onSave={onSaveDomain}
            />
          )}

          {/* Tool calls (loading state) */}
          {message.toolCalls && message.toolCalls.length > 0 && !message.domainResults && (
            <div className="flex items-center gap-2 rounded-lg bg-background/50 px-3 py-2 text-xs text-text-secondary">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking domain availability...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DomainResultsListProps {
  results: DomainResult[];
  onSave?: (domain: string) => void;
}

function DomainResultsList({ results, onSave }: DomainResultsListProps): JSX.Element {
  return (
    <div className="mt-3 space-y-2">
      {results.map((result) => (
        <DomainResultCard
          key={result.domain}
          result={result}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

interface DomainResultCardProps {
  result: DomainResult;
  onSave?: (domain: string) => void;
}

function DomainResultCard({ result, onSave }: DomainResultCardProps): JSX.Element {
  const { domain, available, premium, price } = result;

  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 rounded-lg border p-3",
        "transition-all",
        available
          ? "border-success/30 bg-success/5 hover:border-success/50"
          : "border-border bg-background/50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status indicator */}
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full",
            available ? "bg-success/20 text-success" : "bg-error/20 text-error"
          )}
        >
          {available ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Domain name */}
        <div>
          <p className="font-medium text-text">{domain}</p>
          <p className="text-xs text-text-secondary">
            {available ? (
              premium && price ? (
                <span className="text-warning">Premium: ${price.toLocaleString()}</span>
              ) : (
                <span className="text-success">Available</span>
              )
            ) : (
              <span className="text-error">Taken</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      {available && (
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onSave?.(domain)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-text-secondary transition-colors",
              "hover:bg-primary/10 hover:text-primary"
            )}
            title="Save domain"
          >
            <Bookmark className="h-4 w-4" />
          </button>
          <a
            href={`https://www.namecheap.com/domains/registration/results/?domain=${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-text-secondary transition-colors",
              "hover:bg-primary/10 hover:text-primary"
            )}
            title="View on registrar"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}
    </div>
  );
}
