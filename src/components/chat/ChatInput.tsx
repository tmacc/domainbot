import { useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  suggestions?: string[];
  showSuggestions?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Describe your project idea...",
  disabled = false,
  suggestions = [],
  showSuggestions = false,
  onSuggestionClick,
}: ChatInputProps): JSX.Element {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim() || disabled) return;
      onSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const target = e.target;
    // Auto-resize
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
    onChange(target.value);
  };

  return (
    <div className="border-t border-border bg-surface/50 p-4">
      <div className="mx-auto max-w-3xl">
        {/* Suggestion chips */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onSuggestionClick?.(suggestion)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-sm",
                  "text-text-secondary transition-all",
                  "hover:border-primary hover:bg-primary/5 hover:text-primary"
                )}
              >
                <Sparkles className="mr-1.5 inline-block h-3 w-3" />
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full resize-none rounded-xl border border-border bg-background",
              "py-3 pl-4 pr-12 text-text",
              "placeholder:text-text-secondary",
              "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
              "transition-all",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            style={{
              minHeight: "48px",
              maxHeight: "200px",
            }}
          />
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className={cn(
              "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center",
              "rounded-lg bg-primary text-white transition-all",
              "hover:bg-secondary",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-2 text-center text-xs text-text-secondary">
          DomainBot can make mistakes. Verify domain availability before purchasing.
        </p>
      </div>
    </div>
  );
}
