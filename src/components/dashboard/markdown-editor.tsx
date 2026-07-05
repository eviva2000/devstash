"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const maxEditorHeight = 400;
const headerHeight = 40;

type MarkdownEditorMode = "write" | "preview";

interface MarkdownEditorProps {
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly minHeight?: number;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly value: string;
}

export function MarkdownEditor({
  ariaLabel = "Markdown content",
  className,
  disabled = false,
  minHeight,
  onChange,
  readOnly = false,
  value,
}: MarkdownEditorProps) {
  const [activeMode, setActiveMode] = useState<MarkdownEditorMode>("write");
  const [hasCopied, setHasCopied] = useState(false);
  const lineCount = Math.max(1, value.split("\n").length);
  const totalHeight = Math.min(
    maxEditorHeight,
    Math.max(minHeight ?? (readOnly ? 220 : 260), lineCount * 20 + 96)
  );
  const contentHeight = Math.max(160, totalHeight - headerHeight);
  const isReadOnly = readOnly || disabled;
  const visibleMode = readOnly ? "preview" : activeMode;

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setHasCopied(true);
    window.setTimeout(() => setHasCopied(false), 1400);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-[#1e1e1e] text-card-foreground shadow-xs",
        disabled && "opacity-70",
        className
      )}
      style={{ height: totalHeight }}
    >
      <div className="flex h-10 items-center gap-3 border-b border-white/10 bg-[#2d2d2d] px-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f56]" />
          <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="size-2.5 rounded-full bg-[#27c93f]" />
        </div>

        <div
          aria-label="Markdown editor mode"
          className="flex min-w-0 items-center gap-1"
          role="tablist"
        >
          {!readOnly && (
            <EditorTab
              active={visibleMode === "write"}
              disabled={disabled}
              label="Write"
              onClick={() => setActiveMode("write")}
            />
          )}
          <EditorTab
            active={visibleMode === "preview"}
            disabled={disabled && !readOnly}
            label="Preview"
            onClick={() => setActiveMode("preview")}
          />
        </div>

        <Button
          aria-label="Copy markdown"
          className="ml-auto size-7 text-neutral-300 hover:bg-white/10 hover:text-white"
          disabled={!value}
          onClick={handleCopy}
          size="icon"
          type="button"
          variant="ghost"
        >
          {hasCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>

      {visibleMode === "write" ? (
        <textarea
          aria-label={ariaLabel}
          className="h-full w-full resize-none bg-[#1e1e1e] px-4 py-3 font-mono text-sm leading-6 text-neutral-100 outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed"
          disabled={isReadOnly}
          onChange={(event) => onChange?.(event.target.value)}
          spellCheck={false}
          style={{ height: contentHeight }}
          value={value}
        />
      ) : (
        <div
          className="markdown-preview overflow-auto px-4 py-3"
          style={{ height: contentHeight }}
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-sm text-neutral-500">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}

function EditorTab({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "h-7 rounded px-2 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/10 hover:text-white",
        active && "bg-white/10 text-white"
      )}
      disabled={disabled}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}
