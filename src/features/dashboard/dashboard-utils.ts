import {
  Code2,
  File,
  FileText,
  Image,
  Link as LinkIcon,
  Sparkles,
  Terminal,
} from "lucide-react";

export const typeIconMap = {
  Code2,
  Sparkles,
  FileText,
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
