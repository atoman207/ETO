"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ensureSeeded, useStore } from "@/lib/store";
import { Logo, Seigaiha } from "@/components/ui/misc";

export function HydrationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => typeof window !== "undefined" && useStore.persist.hasHydrated() && useStore.getState().initialized);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    Promise.resolve(useStore.persist.rehydrate())
      .catch(() => undefined)
      .then(() => {
        try {
          ensureSeeded();
        } catch {
          // 保存データが壊れている場合は初期化する
          localStorage.removeItem("takumicho-demo");
          ensureSeeded();
        }
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) return <Splash />;
  return <>{children}</>;
}

function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ai-900">
      <Seigaiha className="absolute inset-0 h-full w-full opacity-70" id="sg-splash" fill="#132c40" />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative flex flex-col items-center">
        <Logo size={64} />
        <div className="font-mincho mt-5 text-3xl font-bold tracking-[0.3em] text-white">匠帳</div>
        <div className="mt-2 text-xs tracking-widest text-ai-200">個別受注生産 案件・装置統合管理</div>
        <div className="mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full w-1/3 rounded-full bg-shu-400" animate={{ x: ["-100%", "300%"] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }} />
        </div>
        <div className="mt-3 text-[11px] text-ai-300">データを読み込んでいます…</div>
      </motion.div>
    </div>
  );
}
