import type React from "react";

export function EditField({
  children,
  label,
  required = false,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  required?: boolean;
}>) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function EditFieldBlock({
  children,
  label,
  required = false,
}: Readonly<{
  children: React.ReactNode;
  label: string;
  required?: boolean;
}>) {
  return (
    <div className="block space-y-2">
      <span className="text-sm font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </div>
  );
}

export function EditTextarea({
  disabled,
  onChange,
  rows,
  value,
}: Readonly<{
  disabled: boolean;
  onChange: (value: string) => void;
  rows: number;
  value: string;
}>) {
  return (
    <textarea
      className="min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      value={value}
    />
  );
}

export function DrawerMeta({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
