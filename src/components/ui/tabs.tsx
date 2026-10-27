"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export interface TabDef<T extends string> {
  key: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
  alert?: boolean;
}

export function Tabs<T extends string>({ tabs, value, onChange, id }: { tabs: TabDef<T>[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div className="scroll-thin -mb-px flex gap-0.5 overflow-x-auto">
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "relative inline-flex h-10 shrink-0 items-center gap-1.5 px-3.5 text-[13px] font-medium transition-colors",
              active ? "text-ai-800" : "text-stone-500 hover:text-stone-800",
            )}
          >
            {t.icon && <span className={cn("transition-colors", active ? "text-ai-600" : "text-stone-400")}>{t.icon}</span>}
            {t.label}
            {t.count !== undefined && (
              <span className={cn("font-num rounded-full px-1.5 text-[10px] leading-4", active ? "bg-ai-100 text-ai-800" : "bg-stone-100 text-stone-500")}>{t.count}</span>
            )}
            {t.alert && <span className="h-1.5 w-1.5 rounded-full bg-shu-500" />}
            {active && (
              <motion.span layoutId={`tab-underline-${id}`} className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-ai-700" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
