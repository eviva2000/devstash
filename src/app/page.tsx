import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Code2,
  FileText,
  Folder,
  Search,
  Sparkles,
  Terminal,
  WandSparkles,
} from "lucide-react";

import { ChaosVisualizer } from "@/components/homepage/chaos-visualizer";
import { DashboardPreview } from "@/components/homepage/dashboard-preview";
import { HomepageNavigation } from "@/components/homepage/homepage-navigation";
import { LogoMark, Wordmark } from "@/components/homepage/logo-mark";
import { PricingToggle } from "@/components/homepage/pricing-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "DevStash — Developer knowledge, organized",
  description: "Save code snippets, AI prompts, commands, files, and links in one searchable developer knowledge hub.",
};

const features = [
  { title: "Code snippets", description: "Save reusable code with syntax highlighting, language detection, and one-click copy.", Icon: Code2, color: "border-t-blue-500", icon: "bg-blue-500/12 text-blue-600 dark:text-blue-300" },
  { title: "AI prompts", description: "Build your personal prompt library and stop rewriting the same context for every model.", Icon: Sparkles, color: "border-t-amber-500", icon: "bg-amber-500/12 text-amber-600 dark:text-amber-300" },
  { title: "Instant search", description: "Search every title, tag, and line of content with a shortcut that is always one key away.", Icon: Search, color: "border-t-indigo-500", icon: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300" },
  { title: "Commands", description: "Keep the CLI incantations you can never quite remember ready for instant reuse.", Icon: Terminal, color: "border-t-cyan-500", icon: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300" },
  { title: "Files & docs", description: "Store reference files and visual inspiration next to the notes that give them meaning.", Icon: FileText, color: "border-t-slate-400", icon: "bg-slate-400/15 text-slate-600 dark:text-slate-200" },
  { title: "Collections", description: "Group related knowledge into projects and topics without losing global search.", Icon: Folder, color: "border-t-green-500", icon: "bg-green-500/12 text-green-600 dark:text-green-300" },
];

const aiCapabilities = [
  ["Automatic tags", "Relevant tags generated from your content."],
  ["Smart summaries", "Get the gist before opening a long note or file."],
  ["Semantic search", "Find the right item even when you forget the words."],
  ["Related knowledge", "Surface helpful connections across your stash."],
];

const footerColumns = [
  { heading: "Product", links: [["Features", "#features"], ["Pro AI", "#pro-ai"], ["Pricing", "#pricing"]] },
  { heading: "Account", links: [["Create account", "/register"], ["Sign in", "/sign-in"], ["Dashboard", "/dashboard"]] },
];

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a className="sr-only z-[100] rounded-md bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#homepage-main">
        Skip to content
      </a>
      <HomepageNavigation />

      <main id="homepage-main">
        <section className="relative isolate overflow-hidden border-b border-border pb-16 pt-16 sm:pt-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 text-foreground/[0.04] [background-image:linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-0 -z-10 size-[38rem] rounded-full bg-indigo-500/12 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-48 top-32 -z-10 size-[32rem] rounded-full bg-sky-500/10 blur-3xl" />

          <div className="mx-auto w-[min(1320px,calc(100%-2rem))]">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-balance text-5xl font-extrabold tracking-[-0.065em] text-foreground sm:text-6xl lg:text-7xl">
                Developer knowledge,<br />
                <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-sky-400 bg-clip-text text-transparent">organized.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg">Everything you save. One searchable home.</p>
              <div className="mt-8 flex justify-center">
                <Link className={cn(buttonVariants({ size: "lg" }), "h-11 bg-indigo-500 px-5 text-white hover:bg-indigo-400")} href="/register">
                  Start free <ArrowRight />
                </Link>
              </div>
            </div>

            <div className="mt-10 grid items-center gap-2 lg:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1.05fr)]">
              <article className="rounded-2xl border-2 border-orange-400/40 bg-card p-4 shadow-xl shadow-black/10 sm:p-5 dark:border-orange-200/40 dark:shadow-black/30">
                <PanelHeading eyebrow="The problem" title="Your knowledge today..." status="Scattered" tone="orange" />
                <ChaosVisualizer />
              </article>

              <div className="flex h-12 items-center justify-center text-indigo-600 lg:h-auto lg:flex-col dark:text-indigo-300">
                <ArrowRight className="size-12 motion-safe:animate-[homepage-arrow-pulse_1.8s_ease-in-out_infinite] lg:size-14" />
                <span className="ml-2 text-[10px] font-bold tracking-[0.16em] uppercase lg:ml-0 lg:mt-2">Organize</span>
              </div>

              <article className="rounded-2xl border-2 border-indigo-400/50 bg-card p-4 shadow-xl shadow-indigo-500/10 sm:p-5 dark:border-indigo-300/50 dark:shadow-indigo-950/30">
                <PanelHeading eyebrow="The solution" title="...with DevStash" status="Organized" tone="green" />
                <DashboardPreview />
              </article>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20" id="features">
          <SectionHeading className="mb-8 sm:mb-10" eyebrow="Everything in its place" title="Built for the way developers think." description="Capture it in seconds. Find it exactly when you need it." />
          <div className="mx-auto grid w-[min(1320px,calc(100%-2rem))] gap-4 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ title, description, Icon, color, icon }, index) => (
              <article className={`group relative min-h-[340px] overflow-hidden rounded-2xl border border-border border-t-2 bg-card p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-foreground/25 ${color}`} key={title}>
                <span className="absolute right-6 top-6 text-xs font-bold text-muted-foreground/70">0{index + 1}</span>
                <span className={`grid size-10 place-items-center rounded-xl ${icon}`}><Icon className="size-5" /></span>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground">{title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
                <FeaturePreview title={title} />
              </article>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-border bg-muted/30 py-12 sm:py-16" id="pro-ai">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-48 size-[34rem] rounded-full bg-violet-500/16 blur-3xl" />
          <div className="relative mx-auto grid w-[min(1400px,calc(100%-2rem))] items-start gap-8 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <Badge className="border-violet-500/25 bg-violet-500/12 text-violet-700 dark:text-violet-200"><Sparkles /> Pro feature</Badge>
              <p className="mt-5 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Your stash, supercharged</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-foreground sm:text-5xl">Let AI do the organizing.</h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">Save the useful part. DevStash Pro understands what you captured and handles the busywork around it.</p>
              <ul className="mt-8 space-y-5">
                {aiCapabilities.map(([title, description]) => (
                  <li className="flex gap-3" key={title}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-400/12 text-violet-700 dark:text-violet-200"><WandSparkles className="size-4" /></span>
                    <span><strong className="block text-sm text-foreground">{title}</strong><span className="mt-1 block text-sm text-muted-foreground">{description}</span></span>
                  </li>
                ))}
              </ul>
              <a className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200" href="#pricing">Explore DevStash Pro <ArrowRight className="size-4" /></a>
            </div>
            <EditorDemo />
          </div>
        </section>

        <section className="py-12 sm:py-16" id="pricing">
          <SectionHeading eyebrow="Simple pricing" title="Start free. Upgrade when you need." description="No trials, no tricks. Your knowledge stays yours on every plan." />
          <PricingToggle />
        </section>

        <section className="relative isolate overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 py-12 text-center sm:py-16">
          <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
          <div className="mx-auto w-[min(680px,calc(100%-2rem))]">
            <Link aria-label="DevStash home" className="inline-flex" href="/">
              <LogoMark className="mx-auto scale-125" />
            </Link>
            <h2 className="mt-6 text-balance text-4xl font-extrabold tracking-[-0.05em] text-white sm:text-5xl">Ready to organize your knowledge?</h2>
            <p className="mt-4 text-lg text-indigo-100/85">Give every useful thing you save a place you can find again.</p>
            <Link className={cn(buttonVariants({ size: "lg" }), "mt-8 h-11 bg-white px-5 text-indigo-700 hover:bg-indigo-50")} href="/register">Build your stash for free <ArrowRight /></Link>
            <p className="mt-4 text-xs text-indigo-100/75">No credit card. No setup headache. Just a better way to remember.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto grid w-[min(1320px,calc(100%-2rem))] gap-8 sm:grid-cols-[1.7fr_repeat(2,1fr)]">
          <div>
            <Link href="/"><Wordmark className="text-lg text-foreground" /></Link>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Your developer knowledge,<br />finally organized.</p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.heading}>
              <h2 className="text-sm font-semibold text-foreground">{column.heading}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map(([label, href]) => <li key={label}><Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" href={href}>{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-8 flex w-[min(1320px,calc(100%-2rem))] flex-col gap-3 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} DevStash. Built for developers.</p>
          <p className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgb(74_222_128)]" /> All systems operational</p>
        </div>
      </footer>
    </div>
  );
}

function PanelHeading({ eyebrow, title, status, tone }: { eyebrow: string; title: string; status: string; tone: "orange" | "green" }) {
  const statusStyles = tone === "orange" ? "bg-orange-400/10 text-orange-200" : "bg-emerald-400/10 text-emerald-200";
  const dotStyles = tone === "orange" ? "bg-orange-400" : "bg-emerald-400";
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground uppercase">{eyebrow}</p>
        <h2 className="mt-1.5 text-xl font-extrabold tracking-[-0.04em] text-foreground">{title}</h2>
      </div>
      <span className={`mt-0.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyles}`}><span className={`size-1.5 rounded-full ${dotStyles}`} />{status}</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, className }: { eyebrow: string; title: string; description: string; className?: string }) {
  return (
    <div className={cn("mx-auto mb-8 max-w-2xl px-4 text-center sm:mb-10", className)}>
      <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-4xl font-extrabold tracking-[-0.055em] text-foreground sm:text-5xl">{title}</h2>
      <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">{description}</p>
    </div>
  );
}

function FeaturePreview({ title }: { title: string }) {
  if (title === "Code snippets") return <div className="absolute inset-x-5 bottom-0 rounded-t-lg border border-white/8 bg-[#0d1018] p-3 font-mono text-[10px] leading-5 text-slate-500"><span className="text-violet-300">export function</span> <span className="text-sky-300">useDebounce</span>(value) &#123;<br />&nbsp; <span className="text-indigo-300">return</span> useMemo(() =&gt; value)<br />&#125;</div>;
  if (title === "AI prompts") return <div className="absolute inset-x-5 bottom-0 rounded-t-lg border border-white/8 bg-[#0d1018] p-3 text-[10px]"><p className="text-amber-300">✦ System prompt</p><p className="mt-2 text-slate-500">Act as a senior TypeScript engineer...</p><span className="mt-3 inline-block rounded bg-amber-400/10 px-2 py-1 text-[8px] text-amber-200">code-review</span></div>;
  if (title === "Instant search") return <div className="absolute inset-x-5 bottom-0 rounded-t-lg border border-white/8 bg-[#0d1018] p-3 text-[10px]"><p className="flex items-center gap-2 rounded border border-white/10 px-2 py-1.5 text-slate-400"><Search className="size-3" /> react auth <kbd className="ml-auto text-[8px]">⌘ K</kbd></p><p className="mt-2 text-slate-500">JWT refresh hook <span className="float-right">Snippet</span></p></div>;
  if (title === "Commands") return <div className="absolute inset-x-5 bottom-0 rounded-t-lg border border-white/8 bg-[#0d1018] p-3 font-mono text-[10px]"><p className="text-slate-600">~/dev/project</p><p className="mt-3 text-cyan-200"><span className="text-emerald-300">$</span> git rebase --onto main...</p></div>;
  if (title === "Files & docs") return <div className="absolute inset-x-5 bottom-0 space-y-2 rounded-t-lg border border-white/8 bg-[#0d1018] p-3 text-[9px]"><p className="text-slate-300">PDF&nbsp; API-design-guide.pdf <span className="float-right text-slate-600">2.4 MB</span></p><p className="text-slate-400">PNG&nbsp; dashboard-inspo.png <span className="float-right text-slate-600">864 KB</span></p></div>;
  return <div className="absolute inset-x-5 bottom-0 space-y-2 rounded-t-lg border border-white/8 bg-[#0d1018] p-3 text-[9px]"><p className="border-l-2 border-blue-500 pl-2 text-slate-300">⚡ Frontend patterns <span className="float-right text-slate-600">18</span></p><p className="border-l-2 border-amber-500 pl-2 text-slate-400">✦ AI toolkit <span className="float-right text-slate-600">12</span></p></div>;
}

function EditorDemo() {
  return (
    <div className="overflow-hidden rounded-2xl border border-violet-300/25 bg-[#10121d] shadow-[0_25px_70px_rgba(0,0,0,.35),0_0_50px_rgba(88,74,210,.1)]">
      <div className="flex h-11 items-center border-b border-white/10 bg-[#181b2a] px-4"><span className="size-2 rounded-full bg-red-400" /><span className="ml-1.5 size-2 rounded-full bg-amber-300" /><span className="ml-1.5 size-2 rounded-full bg-emerald-400" /><span className="ml-5 font-mono text-[10px] text-slate-400">new-snippet.ts</span><span className="ml-auto rounded bg-blue-500/10 px-2 py-1 text-[9px] text-blue-300">TypeScript</span></div>
      <div className="flex min-h-56 overflow-auto p-5 font-mono text-[11px] leading-7"><div className="mr-4 select-none text-right text-slate-700">1<br />2<br />3<br />4<br />5<br />6<br />7<br />8</div><pre className="m-0 text-slate-300"><span className="text-pink-300">export async function</span> <span className="text-sky-300">fetchWithRetry</span>(<br />  url: <span className="text-emerald-300">string</span>, retries = <span className="text-amber-200">3</span><br />) &#123;<br />  <span className="text-pink-300">for</span> (let i = 0; i &lt; retries; i++) &#123;<br />    <span className="text-pink-300">try</span> &#123; <span className="text-pink-300">return await</span> fetch(url) &#125;<br />    <span className="text-pink-300">catch</span> &#123; <span className="text-pink-300">await</span> delay(<span className="text-amber-200">1000</span>) &#125;<br />  &#125;<br />&#125;</pre></div>
      <div className="border-t border-white/10 bg-[#141725] p-4"><p className="text-[10px] font-semibold text-violet-200">✦ AI generated tags</p><div aria-label="AI tag generation progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={100} className="relative mt-2 h-1.5 w-36 overflow-hidden rounded-full bg-violet-200/15" role="progressbar"><span className="block h-full w-full rounded-full bg-gradient-to-r from-violet-500 via-violet-300 to-violet-400" /><span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-transparent via-white/40 to-transparent motion-safe:animate-[homepage-progress-shimmer_1.5s_linear_infinite]" /></div><div className="mt-3 flex flex-wrap gap-2">{["typescript", "fetch", "error-handling", "retry"].map((tag) => <span className="rounded border border-violet-300/20 bg-violet-500/10 px-2 py-1 font-mono text-[9px] text-violet-200" key={tag}>✦ {tag}</span>)}</div><p className="mt-4 rounded-md border border-violet-300/15 bg-violet-500/10 p-3 text-[10px] leading-5 text-slate-400"><span className="font-semibold text-violet-200">✦ AI summary</span> A reusable fetch wrapper with automatic retries and a delay between failed attempts.</p></div>
    </div>
  );
}
