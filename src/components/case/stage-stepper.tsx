"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { STAGES, STAGE_INDEX } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { CaseStatus, Stage } from "@/lib/types";

export function StageStepper({ stage, status }: { stage: Stage; status: CaseStatus }) {
  const cur = STAGE_INDEX[stage];
  const muted = status === "lost" || status === "onhold";
  const allDone = status === "completed";
  return (
    <div className="scroll-thin overflow-x-auto pb-1">
      <div className="relative flex min-w-[860px] items-start">
        <div className="absolute left-[4.5%] right-[4.5%] top-[13px] h-[3px] rounded-full bg-stone-200" />
        <motion.div
          className={cn("absolute left-[4.5%] top-[13px] h-[3px] rounded-full", muted ? "bg-stone-400" : "bg-ai-600")}
          initial={{ width: 0 }}
          animate={{ width: `${(cur / (STAGES.length - 1)) * 91}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        {STAGES.map((s, i) => {
          const done = i < cur || (allDone && i <= cur);
          const current = i === cur && !allDone;
          return (
            <div key={s.key} className="relative z-10 flex flex-1 flex-col items-center" title={s.description}>
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "relative flex h-[29px] w-[29px] items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors",
                  done && (muted ? "border-stone-400 bg-stone-400 text-white" : "border-ai-600 bg-ai-600 text-white"),
                  current && (muted ? "border-stone-500 bg-white text-stone-600" : "border-shu-500 bg-shu-500 text-white"),
                  !done && !current && "border-stone-300 bg-white text-stone-400",
                )}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                {current && !muted && <span className="absolute inset-[-5px] animate-ping rounded-full border-2 border-shu-400 opacity-40" style={{ animationDuration: "2s" }} />}
              </motion.div>
              <span className={cn("mt-1.5 whitespace-nowrap text-[11px]", current ? "font-bold text-shu-700" : done ? "text-ai-800" : "text-stone-400")}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
