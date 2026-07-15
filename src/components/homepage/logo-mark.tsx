import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid size-7 place-items-center", className)}
    >
      <span className="absolute left-0 top-0 size-[46%] rounded-[4px] bg-indigo-400 shadow-[0_4px_12px_rgb(129_140_248_/_45%)]" />
      <span className="absolute right-0 top-[23%] size-[46%] rounded-[4px] bg-sky-400 shadow-[0_4px_12px_rgb(56_189_248_/_35%)]" />
      <span className="absolute bottom-0 left-[23%] size-[46%] rounded-[4px] bg-violet-500 shadow-[0_4px_12px_rgb(139_92_246_/_35%)]" />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-[-0.04em]", className)}>
      <LogoMark />
      <span>DevStash</span>
    </span>
  );
}
