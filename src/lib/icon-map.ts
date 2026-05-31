import {
  Code2,
  Sparkles,
  FileText,
  Terminal,
  File,
  Image,
  Link,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Code2,
  Sparkles,
  FileText,
  Terminal,
  File,
  Image,
  Link,
};

export function getIconComponent(iconName?: string | null): LucideIcon | null {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}

export { iconMap };
