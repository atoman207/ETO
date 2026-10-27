"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Briefcase, Building2, Cpu, FileText, LayoutDashboard, Search, ShoppingCart, Wrench, CornerDownLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { cn, matches } from "@/lib/format";
import { StageBadge } from "@/components/ui/badge";

interface Result {
  id: string;
  group: string;
  icon: ReactNode;
  title: ReactNode;
  sub: ReactNode;
  href: string;
  right?: ReactNode;
}

const PAGES = [
  { label: "ダッシュボード", href: "/", kw: "だっしゅぼーど ホーム" },
  { label: "案件一覧", href: "/cases", kw: "あんけん 引合 見積" },
  { label: "新規引合の登録", href: "/cases/new", kw: "しんき ひきあい 登録" },
  { label: "類似案件・原価比較", href: "/search", kw: "るいじ 過去 原価 比較" },
  { label: "顧客・拠点", href: "/customers", kw: "こきゃく 取引先" },
  { label: "購買管理", href: "/purchasing", kw: "こうばい 発注" },
  { label: "製造進捗", href: "/production", kw: "せいぞう 工程 ガント" },
  { label: "装置台帳", href: "/equipment", kw: "そうち 納入 設備" },
  { label: "修理・改造・部品（アフターサービス）", href: "/service", kw: "あふたー 修理 改造" },
  { label: "資料管理（Google Drive）", href: "/documents", kw: "しりょう ドライブ" },
  { label: "マスタ管理", href: "/masters", kw: "ますた 品目 仕入先 テンプレート" },
  { label: "ご提案資料", href: "/proposal", kw: "ていあん 構成 費用" },
  { label: "設定・権限", href: "/settings", kw: "せってい 権限" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cases = useStore((s) => s.cases);
  const quotes = useStore((s) => s.quotes);
  const equipment = useStore((s) => s.equipment);
  const services = useStore((s) => s.services);
  const customers = useStore((s) => s.customers);
  const pos = useStore((s) => s.purchaseOrders);
  const lk = useLookups();

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const out: Result[] = [];
    const query = q.trim();
    if (!query) {
      PAGES.slice(0, 8).forEach((p) =>
        out.push({ id: p.href, group: "ページ", icon: <LayoutDashboard size={15} />, title: p.label, sub: "", href: p.href }),
      );
      return out;
    }
    cases
      .filter((c) => matches(query, c.dealNo, c.workNo, c.title, lk.customer.get(c.customerId)?.name, lk.customer.get(c.customerId)?.kana, c.tags.join(" ")))
      .slice(0, 8)
      .forEach((c) =>
        out.push({
          id: c.id,
          group: "案件",
          icon: <Briefcase size={15} />,
          title: c.title,
          sub: (
            <span className="font-num">
              {c.dealNo}
              {c.workNo && <> → {c.workNo}</>}　{lk.customer.get(c.customerId)?.name}
            </span>
          ),
          href: `/cases/${c.id}`,
          right: <StageBadge stage={c.stage} status={c.status} />,
        }),
      );
    quotes
      .filter((x) => matches(query, x.quoteNo))
      .slice(0, 5)
      .forEach((x) =>
        out.push({ id: x.id, group: "見積", icon: <FileText size={15} />, title: x.quoteNo, sub: x.subject, href: `/cases/${x.caseId}?tab=quote` }),
      );
    equipment
      .filter((e) => matches(query, e.serialNo, e.name, e.workNo, lk.customer.get(e.customerId)?.name))
      .slice(0, 6)
      .forEach((e) =>
        out.push({
          id: e.id,
          group: "装置",
          icon: <Cpu size={15} />,
          title: e.name,
          sub: (
            <span className="font-num">
              {e.serialNo}　{lk.customer.get(e.customerId)?.name} {lk.site.get(e.siteId)?.name}
            </span>
          ),
          href: `/equipment/${e.id}`,
        }),
      );
    services
      .filter((s) => matches(query, s.ticketNo, s.title))
      .slice(0, 5)
      .forEach((s) =>
        out.push({ id: s.id, group: "アフターサービス", icon: <Wrench size={15} />, title: s.title, sub: <span className="font-num">{s.ticketNo}</span>, href: `/service/${s.id}` }),
      );
    pos
      .filter((p) => matches(query, p.poNo))
      .slice(0, 5)
      .forEach((p) =>
        out.push({ id: p.id, group: "発注", icon: <ShoppingCart size={15} />, title: p.poNo, sub: lk.supplier.get(p.supplierId)?.name, href: `/cases/${p.caseId}?tab=purchase` }),
      );
    customers
      .filter((c) => matches(query, c.name, c.kana, c.code))
      .slice(0, 5)
      .forEach((c) =>
        out.push({ id: c.id, group: "顧客", icon: <Building2 size={15} />, title: c.name, sub: `${c.code}　${c.industry}`, href: `/customers/${c.id}` }),
      );
    PAGES.filter((p) => matches(query, p.label, p.kw)).forEach((p) =>
      out.push({ id: p.href, group: "ページ", icon: <ArrowRight size={15} />, title: p.label, sub: "", href: p.href }),
    );
    return out;
  }, [q, cases, quotes, equipment, services, customers, pos, lk]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (r?: Result) => {
    if (!r) return;
    onClose();
    router.push(r.href);
  };

  if (typeof document === "undefined") return null;
  let lastGroup = "";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="fixed inset-0 bg-ai-950/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 420 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-stone-200"
          >
            <div className="flex items-center gap-3 border-b border-stone-100 px-4">
              <Search size={18} className="text-ai-600" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(results.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    go(results[active]);
                  } else if (e.key === "Escape") onClose();
                }}
                placeholder="番号（T26-／M26-／K26-／S26-／P26-）、案件名、顧客名、装置名…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-400"
              />
              <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 text-[10px] text-stone-500">Esc</kbd>
            </div>
            <div ref={listRef} className="scroll-thin max-h-[52vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-stone-500">
                  「{q}」に一致する情報は見つかりませんでした
                  <div className="mt-1 text-xs text-stone-400">番号の一部（例：0118）やフリガナでも検索できます</div>
                </div>
              )}
              {results.map((r, i) => {
                const header = r.group !== lastGroup;
                lastGroup = r.group;
                return (
                  <div key={`${r.group}-${r.id}`}>
                    {header && <div className="px-4 pb-1 pt-2 text-[10px] font-medium tracking-widest text-stone-400">{r.group}</div>}
                    <button
                      data-idx={i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r)}
                      className={cn("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors", i === active ? "bg-ai-50" : "")}
                    >
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", i === active ? "bg-ai-700 text-white" : "bg-stone-100 text-stone-500")}>{r.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-stone-800">{r.title}</span>
                        {r.sub && <span className="block truncate text-[11px] text-stone-500">{r.sub}</span>}
                      </span>
                      {r.right}
                      {i === active && <CornerDownLeft size={14} className="text-ai-500" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 border-t border-stone-100 bg-stone-50 px-4 py-2 text-[10px] text-stone-500">
              <span>↑↓ で選択</span>
              <span>Enter で開く</span>
              <span className="ml-auto">取引番号 → 見積番号 → 工事番号 → 製造番号 はすべて紐付いています</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
