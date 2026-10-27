"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Briefcase, Download, LayoutGrid, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { cn, fmtDate, manYen, matches, yen } from "@/lib/format";
import { CASE_STATUS, EQUIPMENT_TYPES, EQUIPMENT_TYPE_KEYS, STAGES, STAGE_INDEX } from "@/lib/constants";
import { downloadCsv } from "@/lib/csv";
import type { Case, CaseStatus, Stage } from "@/lib/types";
import { PageHeader, Avatar, EmptyState, DueLabel } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, SegmentedControl, Select } from "@/components/ui/form";
import { Badge, StageBadge } from "@/components/ui/badge";

type SortKey = "updated" | "inquiry" | "amount" | "delivery";

export default function CasesPage() {
  return (
    <Suspense fallback={null}>
      <CasesInner />
    </Suspense>
  );
}

function CasesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const cases = useStore((s) => s.cases);
  const users = useStore((s) => s.users);
  const customers = useStore((s) => s.customers);
  const lk = useLookups();

  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "all">((params.get("stage") as Stage) || "all");
  const [status, setStatus] = useState<CaseStatus | "all" | "open">("open");
  const [rep, setRep] = useState("all");
  const [type, setType] = useState("all");
  const [cust, setCust] = useState("all");
  const [view, setView] = useState<"table" | "board">("table");
  const [sort, setSort] = useState<SortKey>("updated");

  const filtered = useMemo(() => {
    const list = cases.filter((c) => {
      if (status === "open" && !(c.status === "active" || c.status === "onhold")) return false;
      if (status !== "all" && status !== "open" && c.status !== status) return false;
      if (stage !== "all" && c.stage !== stage) return false;
      if (rep !== "all" && c.salesRepId !== rep && c.engineerId !== rep) return false;
      if (type !== "all" && c.equipmentType !== type) return false;
      if (cust !== "all" && c.customerId !== cust) return false;
      const cu = lk.customer.get(c.customerId);
      return matches(q, c.dealNo, c.workNo, c.title, cu?.name, cu?.kana, lk.site.get(c.siteId)?.name, c.tags.join(" "), c.description);
    });
    const sorters: Record<SortKey, (a: Case, b: Case) => number> = {
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
      inquiry: (a, b) => b.inquiryDate.localeCompare(a.inquiryDate),
      amount: (a, b) => b.expectedAmount - a.expectedAmount,
      delivery: (a, b) => (a.order?.deliveryDate ?? a.desiredDeliveryDate ?? "9999").localeCompare(b.order?.deliveryDate ?? b.desiredDeliveryDate ?? "9999"),
    };
    return list.sort(sorters[sort]);
  }, [cases, q, stage, status, rep, type, cust, sort, lk]);

  const total = filtered.reduce((s, c) => s + c.expectedAmount, 0);
  const hasFilter = q || stage !== "all" || status !== "open" || rep !== "all" || type !== "all" || cust !== "all";

  const exportCsv = () =>
    downloadCsv(
      `案件一覧_${new Date().toISOString().slice(0, 10)}.csv`,
      ["取引番号", "工事番号", "案件名", "顧客", "拠点", "装置種別", "ステージ", "状態", "見込/受注金額", "確度", "営業担当", "設計担当", "引合日", "納期"],
      filtered.map((c) => [
        c.dealNo,
        c.workNo ?? "",
        c.title,
        lk.customer.get(c.customerId)?.name,
        lk.site.get(c.siteId)?.name,
        EQUIPMENT_TYPES[c.equipmentType].label,
        STAGES[STAGE_INDEX[c.stage]].label,
        CASE_STATUS[c.status].label,
        c.expectedAmount,
        c.probability,
        lk.user.get(c.salesRepId)?.name,
        c.engineerId ? lk.user.get(c.engineerId)?.name : "",
        c.inquiryDate,
        c.order?.deliveryDate ?? c.desiredDeliveryDate ?? "",
      ]),
    );

  return (
    <div>
      <PageHeader
        title="案件一覧"
        description="取引番号・見積番号・工事番号を案件単位で一元管理しています"
        icon={<Briefcase size={20} />}
        breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "案件一覧" }]}
        actions={
          <>
            <Button icon={<Download size={15} />} onClick={exportCsv}>
              CSV出力（Excel）
            </Button>
            <Button variant="accent" icon={<Plus size={15} />} onClick={() => router.push("/cases/new")}>
              新規引合を登録
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="番号・案件名・顧客名・タグで絞り込み" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus | "all" | "open")} className="w-36">
            <option value="open">進行中＋保留</option>
            <option value="all">すべての状態</option>
            {(Object.keys(CASE_STATUS) as CaseStatus[]).map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS[s].label}のみ
              </option>
            ))}
          </Select>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-36">
            <option value="all">全装置種別</option>
            {EQUIPMENT_TYPE_KEYS.map((k) => (
              <option key={k} value={k}>
                {EQUIPMENT_TYPES[k].label}
              </option>
            ))}
          </Select>
          <Select value={cust} onChange={(e) => setCust(e.target.value)} className="w-48">
            <option value="all">全顧客</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={rep} onChange={(e) => setRep(e.target.value)} className="w-36">
            <option value="all">全担当者</option>
            {users
              .filter((u) => u.role === "sales" || u.role === "engineer")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </Select>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X size={14} />}
              onClick={() => {
                setQ("");
                setStage("all");
                setStatus("open");
                setRep("all");
                setType("all");
                setCust("all");
              }}
            >
              条件クリア
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {view === "table" && (
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-8 w-32 text-xs">
                <option value="updated">更新が新しい順</option>
                <option value="inquiry">引合日が新しい順</option>
                <option value="amount">金額が大きい順</option>
                <option value="delivery">納期が近い順</option>
              </Select>
            )}
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: "table", label: <><List size={13} />一覧</> },
                { value: "board", label: <><LayoutGrid size={13} />ボード</> },
              ]}
            />
          </div>
        </div>
        <div className="scroll-thin flex gap-1.5 overflow-x-auto border-t border-stone-100 px-4 py-2.5">
          <SlidersHorizontal size={14} className="mt-1 shrink-0 text-stone-400" />
          <button onClick={() => setStage("all")} className={cn("shrink-0 rounded-full px-3 py-1 text-xs transition-colors", stage === "all" ? "bg-ai-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200")}>
            全ステージ
          </button>
          {STAGES.map((s) => {
            const n = cases.filter((c) => c.stage === s.key && (status === "all" || (status === "open" ? c.status === "active" || c.status === "onhold" : c.status === status))).length;
            return (
              <button
                key={s.key}
                onClick={() => setStage(s.key)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors", stage === s.key ? "bg-ai-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200")}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                {s.label}
                <span className="font-num opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="mb-2 flex items-center justify-between px-1 text-xs text-stone-500">
        <span>
          <span className="font-num font-bold text-stone-800">{filtered.length}</span> 件　合計 <span className="font-num font-bold text-stone-800">{manYen(total)}</span>
        </span>
        <span>行をクリックすると案件詳細を開きます</span>
      </div>

      {view === "table" ? (
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={<Search size={20} />} title="条件に一致する案件がありません" description="絞り込み条件を変更してください" />
          ) : (
            <div className="scroll-thin overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>番号</th>
                    <th>案件名／顧客・拠点</th>
                    <th>ステージ</th>
                    <th>装置種別</th>
                    <th className="text-right">金額</th>
                    <th>確度</th>
                    <th>担当</th>
                    <th>納期（希望）</th>
                    <th>更新</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.015, 0.3) }}
                      className={cn("cursor-pointer", c.status === "lost" && "opacity-60")}
                      onClick={() => router.push(`/cases/${c.id}`)}
                    >
                      <td className="whitespace-nowrap">
                        <div className="font-num text-[0.75rem] font-semibold text-stone-700">{c.dealNo}</div>
                        <div className={cn("font-num text-[0.6875rem]", c.workNo ? "font-semibold text-shu-600" : "text-stone-400")}>{c.workNo ?? "工番 未発行"}</div>
                      </td>
                      <td className="min-w-[260px]">
                        <Link href={`/cases/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-stone-900 hover:text-ai-700 hover:underline">
                          {c.title}
                        </Link>
                        <div className="text-[0.6875rem] text-stone-500">
                          {lk.customer.get(c.customerId)?.name}　{lk.site.get(c.siteId)?.name}
                        </div>
                      </td>
                      <td>
                        <StageBadge stage={c.stage} status={c.status} />
                      </td>
                      <td className="whitespace-nowrap text-xs text-stone-600">{EQUIPMENT_TYPES[c.equipmentType].label}</td>
                      <td className="whitespace-nowrap text-right">
                        <div className="font-num text-[0.8125rem] font-medium">{yen(c.order?.orderAmount ?? c.expectedAmount)}</div>
                        <div className="text-[0.625rem] text-stone-400">{c.order ? "受注金額" : "見込金額"}</div>
                      </td>
                      <td>
                        {!c.order && c.status === "active" ? (
                          <Badge className={c.probability === "A" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : c.probability === "B" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-stone-100 text-stone-600 ring-stone-300"}>
                            {c.probability}
                          </Badge>
                        ) : (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex -space-x-1.5">
                          <Avatar user={lk.user.get(c.salesRepId)} size={24} />
                          {c.engineerId && <Avatar user={lk.user.get(c.engineerId)} size={24} />}
                        </div>
                      </td>
                      <td className="text-xs">
                        {c.order && c.stage !== "aftercare" ? <DueLabel date={c.order.deliveryDate} /> : <span className="font-num text-stone-500">{fmtDate(c.order?.deliveryDate ?? c.desiredDeliveryDate, false)}</span>}
                      </td>
                      <td className="font-num whitespace-nowrap text-[0.6875rem] text-stone-500">{fmtDate(c.updatedAt.slice(0, 10), false)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Board cases={filtered} />
      )}
    </div>
  );
}

function Board({ cases }: { cases: Case[] }) {
  const lk = useLookups();
  return (
    <div className="scroll-thin flex gap-3 overflow-x-auto pb-4">
      {STAGES.map((s, si) => {
        const list = cases.filter((c) => c.stage === s.key);
        const amount = list.reduce((sum, c) => sum + c.expectedAmount, 0);
        return (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.03 }} className="flex w-64 shrink-0 flex-col rounded-lg bg-kinari-dark/60">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-stone-700">
                <span className={cn("h-2 w-2 rounded-full", s.dot)} />
                {s.label}
              </span>
              <span className="font-num text-[0.6875rem] text-stone-500">
                {list.length}件・{manYen(amount)}
              </span>
            </div>
            <div className="flex min-h-24 flex-col gap-2 px-2 pb-2">
              {list.map((c) => (
                <Link key={c.id} href={`/cases/${c.id}`} className="group block rounded-md border border-stone-200 bg-surface p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-ai-300 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="font-num text-[0.6875rem] font-semibold text-stone-500">{c.workNo ?? c.dealNo}</span>
                    {c.status !== "active" && <Badge className={CASE_STATUS[c.status].color}>{CASE_STATUS[c.status].label}</Badge>}
                  </div>
                  <div className="mt-0.5 text-[0.8125rem] font-medium leading-snug text-stone-800 group-hover:text-ai-800">{c.title}</div>
                  <div className="mt-0.5 truncate text-[0.6875rem] text-stone-500">{lk.customer.get(c.customerId)?.name}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-num text-xs font-medium text-stone-700">{manYen(c.order?.orderAmount ?? c.expectedAmount)}</span>
                    <Avatar user={lk.user.get(c.salesRepId)} size={20} />
                  </div>
                </Link>
              ))}
              {list.length === 0 && <div className="py-6 text-center text-[0.6875rem] text-stone-400">案件なし</div>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
