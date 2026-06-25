import Image from "next/image";

import { cn } from "@/lib/utils";

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "DS";
}

export function UserAvatar({
  className,
  image,
  name,
}: {
  className?: string;
  image?: string | null;
  name: string;
}) {
  const baseClassName = cn(
    "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground",
    className
  );

  if (image) {
    return (
      <span className={baseClassName}>
        <Image
          alt={`${name} avatar`}
          className="size-full object-cover"
          height={36}
          referrerPolicy="no-referrer"
          src={image}
          width={36}
        />
      </span>
    );
  }

  return <span className={baseClassName}>{getInitials(name)}</span>;
}
