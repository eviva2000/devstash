"use client";

import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/homepage/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pro-ai", label: "Pro AI" },
  { href: "#pricing", label: "Pricing" },
];

export function HomepageNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const updateHeader = () => setHasScrolled(window.scrollY > 12);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent bg-background/70 transition-colors backdrop-blur-xl",
        hasScrolled && "border-border bg-background/95"
      )}
    >
      <div className="mx-auto flex h-16 w-[min(1180px,calc(100%-2rem))] items-center justify-between">
        <Link href="/" aria-label="DevStash home" onClick={closeMenu}>
          <Wordmark className="text-lg text-foreground" />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            href="/sign-in"
          >
            Sign in
          </Link>
          <Link
            className={cn(buttonVariants({ size: "sm" }), "bg-indigo-500 text-white hover:bg-indigo-400")}
            href="/register"
          >
            Get started <ArrowRight />
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            aria-controls="homepage-navigation"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            className="rounded-md p-2 text-foreground hover:bg-muted"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <nav
          className="border-t border-border bg-background px-4 py-4 md:hidden"
          id="homepage-navigation"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto grid w-[min(1180px,100%)] gap-1">
            {navLinks.map((link) => (
              <Link
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                href={link.href}
                key={link.href}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <Link
                className={buttonVariants({ variant: "outline", size: "sm" })}
                href="/sign-in"
                onClick={closeMenu}
              >
                Sign in
              </Link>
              <Link
                className={cn(buttonVariants({ size: "sm" }), "bg-indigo-500 text-white hover:bg-indigo-400")}
                href="/register"
                onClick={closeMenu}
              >
                Get started
              </Link>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
