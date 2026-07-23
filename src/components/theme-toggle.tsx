"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { readonly className?: string }) {
  const { setTheme } = useTheme();

  const toggleTheme = () => {
    const nextTheme = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";

    setTheme(nextTheme);
  };

  return (
    <Button
      aria-label="Toggle color theme"
      className={cn("relative", className)}
      onClick={toggleTheme}
      size="icon"
      title="Toggle color theme"
      type="button"
      variant="outline"
    >
      <Sun aria-hidden="true" className="hidden dark:block" />
      <Moon aria-hidden="true" className="block dark:hidden" />
    </Button>
  );
}
