"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ensureSeeded, useStore } from "@/lib/store";
import { Logo } from "@/components/ui/misc";
import { WaPattern } from "@/components/theme/wa-pattern";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-sidebar">
      <WaPattern className="absolute inset-0 h-full w-full opacity-70" id="wa-splash" />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative flex flex-col items-center">
        <Logo size={64} />
        <div className="font-mincho mt-5 text-3xl font-bold tracking-[0.3em] text-sidebar-fg">匠帳</div>
        <div className="mt-2 text-xs tracking-widest text-sidebar-muted">個別受注生産 案件・装置統合管理</div>
        <div className="mt-8 h-0.5 w-40 overflow-hidden rounded-full bg-sidebar-border">
          <motion.div className="h-full w-1/3 rounded-full bg-shu-400" animate={{ x: ["-100%", "300%"] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }} />
        </div>
        <div className="mt-3 text-[0.6875rem] text-sidebar-subtle">データを読み込んでいます…</div>
      </motion.div>
    </div>
  );
}
