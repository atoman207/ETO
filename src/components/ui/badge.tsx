import type { ReactNode } from "react";
import { cn } from "@/lib/format";
import { CASE_STATUS, stageDef } from "@/lib/constants";
import type { CaseStatus, Stage } from "@/lib/types";

export function Badge({ className, children, dot }: { className?: string; children: ReactNode; dot?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[0.6875rem] font-medium leading-4 ring-1 ring-inset",
        className ?? "bg-stone-100 text-stone-600 ring-stone-300",
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
      {children}
    </span>
  );
}

export function StageBadge({ stage, status }: { stage: Stage; status?: CaseStatus }) {
  if (status === "lost" || status === "onhold") {
    const s = CASE_STATUS[status];
    return <Badge className={s.color}>{s.label}</Badge>;
  }
  const d = stageDef(stage);
  return (
    <Badge className={d.color} dot={d.dot}>
      {d.label}
    </Badge>
  );
}

export function NumberTag({ label, value, tone = "stone", className }: { label: string; value?: string; tone?: "stone" | "ai" | "shu" | "emerald" | "violet"; className?: string }) {
  const tones = {
    stone: "border-stone-300 text-stone-700",
    ai: "border-ai-300 text-ai-800",
    shu: "border-shu-300 text-shu-700",
    emerald: "border-emerald-300 text-emerald-800",
    violet: "border-violet-300 text-violet-800",
  };
  return (
    <span className={cn("inline-flex items-stretch overflow-hidden rounded-sm border bg-surface text-xs", value ? tones[tone] : "border-dashed border-stone-300 text-stone-400", className)}>
      <span className={cn("px-1.5 py-0.5 text-[0.625rem] font-medium", value ? "bg-stone-50" : "")}>{label}</span>
      <span className="font-num px-1.5 py-0.5 font-semibold">{value ?? "未発行"}</span>
    </span>
  );
}
