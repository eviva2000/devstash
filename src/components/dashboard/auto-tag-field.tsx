"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { generateAutoTags } from "@/actions/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseTags } from "@/lib/utils";

export function AutoTagField({
  content,
  disabled,
  isPro,
  onChange,
  tags,
  title,
}: Readonly<{
  content: string;
  disabled: boolean;
  isPro: boolean;
  onChange: (tags: string) => void;
  tags: string;
  title: string;
}>) {
  const inputId = useId();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const canSuggest = !disabled && !isSuggesting && title.trim().length > 0;

  async function handleSuggest() {
    setIsSuggesting(true);
    setSuggestions([]);

    try {
      const result = await generateAutoTags({
        title,
        content,
        existingTags: parseTags(tags),
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setSuggestions(result.data);
    } catch {
      toast.error("AI tag suggestions are temporarily unavailable. Try again.");
    } finally {
      setIsSuggesting(false);
    }
  }

  function acceptSuggestion(suggestion: string) {
    const existingTags = parseTags(tags);
    const alreadyAdded = existingTags.some(
      (tag) => tag.toLowerCase() === suggestion.toLowerCase()
    );

    if (!alreadyAdded) {
      onChange([...existingTags, suggestion].join(", "));
    }

    removeSuggestion(suggestion);
  }

  function removeSuggestion(suggestion: string) {
    setSuggestions((current) =>
      current.filter((currentSuggestion) => currentSuggestion !== suggestion)
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <label
          className="text-sm font-medium text-muted-foreground"
          htmlFor={inputId}
        >
          Tags
        </label>
        {isPro && (
          <Button
            disabled={!canSuggest}
            onClick={handleSuggest}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isSuggesting ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {isSuggesting ? "Suggesting..." : "Suggest Tags"}
          </Button>
        )}
      </div>

      <Input
        disabled={disabled}
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        placeholder="react, terminal, workflow"
        value={tags}
      />

      {suggestions.length > 0 && (
        <div
          aria-label="Suggested tags"
          aria-live="polite"
          className="space-y-2.5 rounded-xl border border-primary/25 bg-muted/60 p-3 shadow-sm"
        >
          <p className="text-xs font-semibold text-foreground/80">
            Suggested tags
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Badge
                className="h-7 gap-1.5 bg-background/80 pl-2.5 pr-1 shadow-xs"
                key={suggestion}
                variant="outline"
              >
                <span className="text-blue-600 dark:text-blue-400">
                  {suggestion}
                </span>
                <span className="flex items-center gap-0.5">
                  <button
                    aria-label={`Accept ${suggestion}`}
                    className="inline-flex size-5 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={disabled}
                    onClick={() => acceptSuggestion(suggestion)}
                    title={`Accept ${suggestion}`}
                    type="button"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    aria-label={`Reject ${suggestion}`}
                    className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={disabled}
                    onClick={() => removeSuggestion(suggestion)}
                    title={`Reject ${suggestion}`}
                    type="button"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
