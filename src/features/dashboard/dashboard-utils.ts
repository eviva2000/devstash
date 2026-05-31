import {
  Code,
  Code2,
  File,
  FileText,
  Image,
  Link as LinkIcon,
  Sparkles,
  StickyNote,
  Terminal,
} from "lucide-react";

export const typeIconMap = {
  Code,
  Code2,
  Sparkles,
  FileText,
  StickyNote,
  Terminal,
  File,
  Image,
  Link: LinkIcon,
};

export const typeColorMap = {
  blue: "bg-blue-500/15 text-blue-400",
  purple: "bg-purple-500/15 text-purple-400",
  zinc: "bg-zinc-500/20 text-zinc-300",
  green: "bg-emerald-500/15 text-emerald-400",
  orange: "bg-orange-500/15 text-orange-400",
  pink: "bg-pink-500/15 text-pink-400",
  cyan: "bg-cyan-500/15 text-cyan-400",
};

export const typeBorderColorMap = {
  blue: "border-blue-500/50",
  purple: "border-purple-500/50",
  zinc: "border-zinc-500/50",
  green: "border-emerald-500/50",
  orange: "border-orange-500/50",
  pink: "border-pink-500/50",
  cyan: "border-cyan-500/50",
};

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function getTypeColorStyle(color?: string | null) {
  if (!color || !hexColorPattern.test(color)) {
    return undefined;
  }

  return {
    backgroundColor: `${color}26`,
    color,
  };
}

export function getTypeBorderStyle(color?: string | null) {
  if (!color || !hexColorPattern.test(color)) {
    return undefined;
  }

  return { borderColor: `${color}80` };
}

const pluralTypeSlugs: Record<string, string> = {
  url: "urls",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function getTypeHref(slug: string) {
  return `/items/${pluralTypeSlugs[slug] ?? `${slug}s`}`;
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}
