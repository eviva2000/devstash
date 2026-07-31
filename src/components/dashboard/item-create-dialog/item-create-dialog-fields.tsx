import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function CreateField({
  children,
  label,
  required = false,
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      {children}
    </label>
  );
}

export function CreateFieldBlock({
  action,
  children,
  className,
  label,
  required = false,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className={cn("block space-y-1.5", className)}>
      {action ? (
        <div className="flex min-h-8 items-center justify-between gap-2">
          <FieldLabel required={required}>{label}</FieldLabel>
          {action}
        </div>
      ) : (
        <FieldLabel required={required}>{label}</FieldLabel>
      )}
      {children}
    </div>
  );
}

export function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-sm font-medium text-muted-foreground">
      {children}
      {required && <span className="text-destructive"> *</span>}
    </span>
  );
}

export function CreateTextarea({
  ariaLabel,
  disabled,
  onChange,
  rows,
  value,
}: {
  ariaLabel?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}) {
  return (
    <textarea
      aria-label={ariaLabel}
      className="w-full resize-none rounded-lg border border-input bg-input/20 px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow,background-color,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      value={value}
    />
  );
}
