"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Hanko } from "@/components/ui/misc";
import type { ApprovalStep, User } from "@/lib/types";
import { toDate } from "@/lib/format";

export function PrintShell({ title, children }: { title: string; children: ReactNode }) {
  // 帳票は表示倍率の設定に関係なく実寸で表示する
  useEffect(() => {
    document.documentElement.setAttribute("data-print", "");
    return () => document.documentElement.removeAttribute("data-print");
  }, []);
  return (
    <div className="min-h-screen bg-stone-300/70 pb-10 print:bg-white print:pb-0">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-stone-300 bg-white/90 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button size="sm" icon={<ArrowLeft size={14} />} onClick={() => (window.history.length > 1 ? window.history.back() : window.close())}>
            戻る
          </Button>
          <span className="text-sm font-bold text-stone-800">{title}</span>
          <span className="hidden text-xs text-stone-500 sm:inline">印刷ダイアログで「PDFに保存」を選ぶと PDF ファイルとして保存できます</span>
        </div>
        <Button variant="primary" icon={<Printer size={15} />} onClick={() => window.print()}>
          印刷・PDF保存
        </Button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="print-sheet mx-auto mt-8 bg-white px-[16mm] py-[14mm] text-[0.75rem] leading-relaxed text-stone-900 shadow-2xl"
        style={{ width: "210mm", minHeight: "297mm" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** 角印（社印） */
export function CompanySeal({ name, size = 70 }: { name: string; size?: number }) {
  const text = (name.replace(/\s/g, "") + "之印").slice(0, 16);
  const cols = Math.ceil(text.length / 4);
  return (
    <div className="absolute flex items-center justify-center border-[2.5px] border-inshu text-inshu opacity-85" style={{ width: size, height: size, transform: "rotate(-2deg)", padding: 3 }}>
      <div className="font-mincho grid h-full w-full font-bold leading-none" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, direction: "rtl", fontSize: size / 5.2 }}>
        {Array.from({ length: cols }).map((_, ci) => (
          <div key={ci} className="flex flex-col items-center justify-around" style={{ direction: "ltr" }}>
            {text.slice(ci * 4, ci * 4 + 4).split("").map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StampBoxes({ steps, users, labels }: { steps?: ApprovalStep[]; users: Map<string, User>; labels?: string[] }) {
  const cols = labels ?? steps?.map((s) => s.label) ?? [];
  return (
    <table className="border-collapse text-center text-[0.5625rem]">
      <tbody>
        <tr>
          {cols.map((l) => (
            <td key={l} className="w-[17mm] border border-stone-500 py-0.5">{l}</td>
          ))}
        </tr>
        <tr>
          {cols.map((l, i) => {
            const s = steps?.[i];
            const u = s?.status === "approved" && s.userId ? users.get(s.userId) : undefined;
            return (
              <td key={l} className="h-[16mm] border border-stone-500">
                <div className="flex flex-col items-center justify-center">
                  {u && <Hanko name={u.name} size={36} animateIn={false} />}
                  {s?.at && <span className="font-num mt-0.5 text-[0.5rem] text-stone-500">{toDate(s.at).getMonth() + 1}/{toDate(s.at).getDate()}</span>}
                </div>
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
