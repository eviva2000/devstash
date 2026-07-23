"use client";

import { Check, Copy } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import type { BeforeMount, EditorProps } from "@monaco-editor/react";

import { Button } from "@/components/ui/button";
import {
  getCodeLanguageLabel,
  normalizeCodeLanguage,
} from "@/lib/code-languages";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic<EditorProps>(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  {
    loading: () => <CodeEditorLoading />,
    ssr: false,
  }
);

const maxEditorHeight = 400;
const headerHeight = 40;

interface CodeEditorProps {
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly language?: string | null;
  readonly minHeight?: number;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly value: string;
}

export function CodeEditor({
  ariaLabel = "Code content",
  className,
  disabled = false,
  language,
  minHeight,
  onChange,
  readOnly = false,
  value,
}: CodeEditorProps) {
  const [hasCopied, setHasCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const normalizedLanguage = normalizeCodeLanguage(language);
  const displayLanguage = getCodeLanguageLabel(language);
  const lineCount = Math.max(1, value.split("\n").length);
  const totalHeight = Math.min(
    maxEditorHeight,
    Math.max(minHeight ?? (readOnly ? 220 : 260), lineCount * 20 + 96)
  );
  const editorHeight = Math.max(160, totalHeight - headerHeight);
  const isReadOnly = readOnly || disabled;

  const editorOptions = useMemo<EditorProps["options"]>(
    () => ({
      ariaLabel,
      automaticLayout: true,
      contextmenu: !readOnly,
      domReadOnly: isReadOnly,
      folding: false,
      fontFamily:
        "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontLigatures: true,
      fontSize: 13,
      glyphMargin: false,
      lineDecorationsWidth: 8,
      lineNumbers: "on",
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      padding: { bottom: 12, top: 12 },
      readOnly: isReadOnly,
      renderLineHighlight: readOnly ? "none" : "line",
      scrollBeyondLastLine: false,
      scrollbar: {
        alwaysConsumeMouseWheel: false,
        horizontalScrollbarSize: 8,
        useShadows: false,
        verticalScrollbarSize: 8,
      },
      smoothScrolling: true,
      tabSize: 2,
      wordWrap: "on",
    }),
    [ariaLabel, isReadOnly, readOnly]
  );

  const beforeMount = useCallback<BeforeMount>((monaco) => {
    monaco.editor.defineTheme("devstash-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#141414",
        "editor.foreground": "#f5f5f5",
        "editor.lineHighlightBackground": "#262626",
        "editorLineNumber.foreground": "#737373",
        "editorLineNumber.activeForeground": "#d4d4d4",
        "editor.selectionBackground": "#525252",
        "editor.inactiveSelectionBackground": "#404040",
        "editorCursor.foreground": "#f5f5f5",
        "scrollbar.shadow": "#00000000",
        "scrollbarSlider.activeBackground": "#73737399",
        "scrollbarSlider.background": "#73737355",
        "scrollbarSlider.hoverBackground": "#73737377",
      },
    });
    monaco.editor.defineTheme("devstash-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#fafafa",
        "editor.foreground": "#171717",
        "editor.lineHighlightBackground": "#f5f5f5",
        "editorLineNumber.foreground": "#a3a3a3",
        "editorLineNumber.activeForeground": "#525252",
        "editor.selectionBackground": "#bfdbfe",
        "editor.inactiveSelectionBackground": "#dbeafe",
        "editorCursor.foreground": "#171717",
        "scrollbar.shadow": "#00000000",
        "scrollbarSlider.activeBackground": "#73737399",
        "scrollbarSlider.background": "#a3a3a355",
        "scrollbarSlider.hoverBackground": "#73737377",
      },
    });
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setHasCopied(true);
    window.setTimeout(() => setHasCopied(false), 1400);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-background text-foreground shadow-xs",
        disabled && "opacity-70",
        className
      )}
      style={{ height: totalHeight }}
    >
      <div className="flex h-10 items-center gap-3 border-b border-border bg-muted px-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f56]" />
          <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="size-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <span className="ml-auto truncate text-xs font-medium text-muted-foreground">
          {displayLanguage}
        </span>
        <Button
          aria-label="Copy code"
          className="size-7 text-muted-foreground hover:bg-background hover:text-foreground"
          disabled={!value}
          onClick={handleCopy}
          size="icon"
          type="button"
          variant="ghost"
        >
          {hasCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <MonacoEditor
        height={`${editorHeight}px`}
        language={normalizedLanguage}
        loading={<CodeEditorLoading />}
        onChange={(nextValue) => onChange?.(nextValue ?? "")}
        options={editorOptions}
        theme={
          resolvedTheme === "light" ? "devstash-light" : "devstash-dark"
        }
        value={value}
        width="100%"
        beforeMount={beforeMount}
      />
    </div>
  );
}

function CodeEditorLoading() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center bg-background text-xs text-muted-foreground">
      Loading editor...
    </div>
  );
}
