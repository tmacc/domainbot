import { Globe } from "lucide-react";

export function TypingIndicator(): JSX.Element {
  return (
    <div className="mb-4 flex justify-start">
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
        <Globe className="h-4 w-4 text-primary" />
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
        </div>
      </div>
    </div>
  );
}
