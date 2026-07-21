"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generateDescription } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { parseTags } from "@/lib/utils";

export function GenerateDescriptionButton({
  content,
  disabled,
  fileName,
  isPro,
  itemType,
  language,
  onGenerated,
  tags,
  title,
  url,
}: Readonly<{
  content: string;
  disabled: boolean;
  fileName: string;
  isPro: boolean;
  itemType: string;
  language: string;
  onGenerated: (description: string) => void;
  tags: string;
  title: string;
  url: string;
}>) {
  const [isGenerating, setIsGenerating] = useState(false);
  const parsedTags = parseTags(tags);
  const hasContext = Boolean(
    title.trim() ||
      content.trim() ||
      url.trim() ||
      fileName.trim() ||
      parsedTags.length
  );
  const canGenerate = !disabled && !isGenerating && hasContext;
  const label = isGenerating
    ? "Generating description"
    : "Generate description";
  const tooltip = hasContext
    ? label
    : "Add a title, content, URL, file, or tag first";

  if (!isPro) {
    return null;
  }

  async function handleGenerate() {
    setIsGenerating(true);

    try {
      const result = await generateDescription({
        itemType,
        title,
        content,
        language,
        url,
        tags: parsedTags,
        fileName,
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onGenerated(result.data);
      toast.success("Description generated.");
    } catch {
      toast.error(
        "AI description generation is temporarily unavailable. Try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <span className="shrink-0" title={tooltip}>
      <Button
        aria-busy={isGenerating}
        aria-label={label}
        className="border-violet-500/25 text-violet-600 hover:border-violet-500/40 hover:bg-violet-500/15 hover:text-violet-700 hover:[&_svg]:scale-110 [&_svg]:transition-transform dark:text-violet-400 dark:hover:bg-violet-400/15 dark:hover:text-violet-300"
        disabled={!canGenerate}
        onClick={handleGenerate}
        size="sm"
        type="button"
        variant="outline"
      >
        {isGenerating ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Sparkles />
        )}
        {isGenerating ? "Generating..." : "Generate"}
      </Button>
    </span>
  );
}
