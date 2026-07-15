import { Search } from "lucide-react";

import { Wordmark } from "@/components/homepage/logo-mark";

const cards = [
  { color: "border-t-blue-500", label: "Snippet", title: "React fetch hook", detail: "const { data } = use..." },
  { color: "border-t-amber-500", label: "Prompt", title: "Code review expert", detail: "Review this pull request..." },
  { color: "border-t-cyan-500", label: "Command", title: "Undo last commit", detail: "git reset --soft HEAD~1" },
  { color: "border-t-green-500", label: "Note", title: "Deploy checklist", detail: "Pre-flight steps for prod..." },
];

export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-indigo-200/20 bg-[#0d1018]">
      <div className="flex h-9 items-center gap-1 border-b border-white/10 bg-[#171b28] px-3">
        <span className="size-1.5 rounded-full bg-red-400" />
        <span className="size-1.5 rounded-full bg-amber-300" />
        <span className="size-1.5 rounded-full bg-emerald-400" />
        <div className="ml-3 flex h-5 w-full max-w-48 items-center gap-1.5 rounded border border-white/8 bg-[#10131d] px-2 text-[8px] text-slate-500">
          <Search className="size-2.5" />
          Search your stash...
          <kbd className="ml-auto rounded bg-white/8 px-1 text-[7px]">⌘ K</kbd>
        </div>
      </div>

      <div className="grid min-h-72 grid-cols-[4.8rem_minmax(0,1fr)] sm:grid-cols-[6.2rem_minmax(0,1fr)]">
        <aside className="border-r border-white/10 px-2 py-4 text-[8px] text-slate-500">
          <Wordmark className="mb-5 text-[9px] text-slate-200 [&>span:first-child]:scale-70" />
          <div className="rounded bg-white/10 px-2 py-1.5 text-slate-200">All items</div>
          <div className="mt-1 px-2 py-1.5">Snippets <span className="float-right">24</span></div>
          <div className="px-2 py-1.5">Prompts <span className="float-right">18</span></div>
          <div className="px-2 py-1.5">Commands <span className="float-right">12</span></div>
          <p className="mt-6 px-2 text-[7px] font-bold tracking-wider text-slate-600 uppercase">Collections</p>
          <div className="px-2 py-1.5">Frontend</div>
          <div className="px-2 py-1.5">AI toolkit</div>
        </aside>

        <div className="min-w-0 p-3 sm:p-4">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-100">Your stash</p>
              <p className="mt-0.5 text-[8px] text-slate-500">54 saved items</p>
            </div>
            <span className="rounded bg-indigo-500 px-2 py-1 text-[8px] font-medium text-white">+ New item</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cards.map((card) => (
              <div className={`min-w-0 rounded-md border border-white/10 border-t-2 bg-[#141824] p-2 ${card.color}`} key={card.title}>
                <p className="text-[7px] text-slate-500">{card.label}</p>
                <p className="mt-2 truncate text-[9px] font-semibold text-slate-200">{card.title}</p>
                <p className="mt-1 truncate font-mono text-[7px] text-slate-500">{card.detail}</p>
                <span className="mt-3 inline-block rounded bg-white/6 px-1.5 py-0.5 text-[6px] text-slate-500">saved</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
