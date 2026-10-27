"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Calculator,
  ClipboardCheck,
  Copy,
  Cpu,
  Factory,
  FileText,
  FolderOpen,
  GitCompare,
  History,
  LayoutDashboard,
  ListTree,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Printer,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn } from "@/lib/format";
import { CASE_STATUS, EQUIPMENT_TYPES } from "@/lib/constants";
import type { Case } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge, NumberTag, StageBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, type TabDef } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { Field, Textarea } from "@/components/ui/form";
import { StageStepper } from "@/components/case/stage-stepper";
import { OrderModal, WorkNoIssuedModal } from "@/components/case/order-modals";
import { OverviewTab } from "@/components/case/tabs/overview-tab";
import { SpecTab } from "@/components/case/tabs/spec-tab";
import { CostTab } from "@/components/case/tabs/cost-tab";
import { QuoteTab } from "@/components/case/tabs/quote-tab";
import { ReviewTab } from "@/components/case/tabs/review-tab";
import { BomTab } from "@/components/case/tabs/bom-tab";
import { PurchaseTab } from "@/components/case/tabs/purchase-tab";
import { ProductionTab } from "@/components/case/tabs/production-tab";
import { ShipmentTab } from "@/components/case/tabs/shipment-tab";
import { AfterTab } from "@/components/case/tabs/after-tab";
import { DocumentsTab } from "@/components/case/tabs/documents-tab";
import { HistoryTab } from "@/components/case/tabs/history-tab";
import type { CaseTab, CaseTabProps } from "@/components/case/tab-types";


export default function CaseDetailPage() {
  return (
    <Suspense fallback={null}>
      <CaseDetail />
    </Suspense>
  );
}

function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const c = useStore((s) => s.cases.find((x) => x.id === id));
  const quotes = useStore((s) => s.quotes);
  const equipment = useStore((s) => s.equipment);
  const services = useStore((s) => s.services);
  const pos = useStore((s) => s.purchaseOrders);
  const documents = useStore((s) => s.documents);
  const lk = useLookups();
  const [tab, setTab] = useState<CaseTab>((params.get("tab") as CaseTab) || "overview");
  const [orderOpen, setOrderOpen] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);

  useEffect(() => {
    const t = params.get("tab") as CaseTab | null;
    if (t) setTab(t);
  }, [params]);

  const goTab = (t: CaseTab) => {
    setTab(t);
    router.replace(`/cases/${id}?tab=${t}`, { scroll: false });
  };

  const counts = useMemo(() => {
    if (!c) return null;
    const eqs = equipment.filter((e) => e.caseId === c.id);
    return {
      quotes: quotes.filter((q) => q.caseId === c.id),
      eqs,
      svc: services.filter((s) => eqs.some((e) => e.id === s.equipmentId)).length,
      pos: pos.filter((p) => p.caseId === c.id).length,
      docs: documents.filter((d) => d.caseId === c.id).length,
    };
  }, [c, quotes, equipment, services, pos, documents]);

  if (!c || !counts) {
    return <EmptyState icon={<FileText size={20} />} title="案件が見つかりません" description="削除されたか、URLが正しくない可能性があります。" action={<Link href="/cases" className="text-sm text-ai-700 underline">案件一覧へ戻る</Link>} />;
  }

  const tabs: TabDef<CaseTab>[] = [
    { key: "overview", label: "概要", icon: <LayoutDashboard size={14} /> },
    { key: "spec", label: "仕様", icon: <SlidersHorizontal size={14} /> },
    { key: "cost", label: "原価", icon: <Calculator size={14} />, alert: c.stage === "costing" },
    { key: "quote", label: "見積", icon: <FileText size={14} />, count: counts.quotes.length, alert: counts.quotes.some((q) => q.status === "pending") },
    { key: "review", label: "取引審査", icon: <ClipboardCheck size={14} />, alert: c.review.status === "pending" },
    { key: "bom", label: "BOM（部品表）", icon: <ListTree size={14} />, count: c.bom.length || undefined },
    { key: "purchase", label: "購買", icon: <ShoppingCart size={14} />, count: counts.pos || undefined },
    { key: "production", label: "製造", icon: <Factory size={14} />, alert: c.processes.some((p) => p.status === "delayed") },
    { key: "shipment", label: "出荷・納品", icon: <Truck size={14} /> },
    { key: "after", label: "装置・アフター", icon: <Cpu size={14} />, count: counts.eqs.length || undefined },
    { key: "docs", label: "資料（Drive）", icon: <FolderOpen size={14} />, count: counts.docs },
    { key: "history", label: "履歴", icon: <History size={14} /> },
  ];

  const latestQuote = [...counts.quotes].sort((a, b) => b.revision - a.revision)[0];
  const props: CaseTabProps = { c, goTab, openOrder: () => setOrderOpen(true), onWorkNo: (w) => setIssued(w) };

  return (
    <div>
      <nav className="mb-2 flex items-center gap-1 text-xs text-stone-500">
        <Link href="/" className="hover:text-ai-700 hover:underline">ホーム</Link>
        <span className="text-stone-300">/</span>
        <Link href="/cases" className="hover:text-ai-700 hover:underline">案件一覧</Link>
        <span className="text-stone-300">/</span>
        <span className="font-num text-stone-700">{c.workNo ?? c.dealNo}</span>
      </nav>

      <Card className="mb-4 overflow-hidden">
        <div className="relative px-5 pb-4 pt-4">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-ai-50/70 to-transparent" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <NumberTag label="取引番号" value={c.dealNo} />
                <ArrowRight size={12} className="text-stone-300" />
                <NumberTag label="見積番号" value={latestQuote?.quoteNo} tone="ai" />
                <ArrowRight size={12} className="text-stone-300" />
                <NumberTag label="工事番号" value={c.workNo} tone="shu" />
                {counts.eqs.length > 0 && (
                  <>
                    <ArrowRight size={12} className="text-stone-300" />
                    <Link href={`/equipment/${counts.eqs[0].id}`}>
                      <NumberTag label="製造番号" value={counts.eqs.length > 1 ? `${counts.eqs[0].serialNo} 他${counts.eqs.length - 1}台` : counts.eqs[0].serialNo} tone="emerald" />
                    </Link>
                  </>
                )}
              </div>
              <h1 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-stone-900">
                {c.title}
                <StageBadge stage={c.stage} />
                {c.status !== "active" && <Badge className={CASE_STATUS[c.status].color}>{CASE_STATUS[c.status].label}</Badge>}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-stone-600">
                <Link href={`/customers/${c.customerId}`} className="font-medium text-ai-800 hover:underline">
                  {lk.customer.get(c.customerId)?.name}
                </Link>
                <span>{lk.site.get(c.siteId)?.name}</span>
                <span className="text-stone-400">｜</span>
                <span>{EQUIPMENT_TYPES[c.equipmentType].label}</span>
                {c.sourceEquipmentId && (
                  <Link href={`/equipment/${c.sourceEquipmentId}`} className="rounded bg-violet-50 px-1.5 text-xs text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100">
                    既設装置 {lk.equipment.get(c.sourceEquipmentId)?.serialNo} の改造・更新
                  </Link>
                )}
              </div>
              {c.status === "lost" && c.lostReason && <div className="mt-2 rounded bg-stone-100 px-3 py-1.5 text-xs text-stone-600">失注理由：{c.lostReason}</div>}
            </div>
            <HeaderActions c={c} latestQuoteId={latestQuote?.id} />
          </div>
          <div className="relative mt-5">
            <StageStepper stage={c.stage} status={c.status} />
          </div>
        </div>
        <div className="border-t border-stone-100 px-3">
          <Tabs id="case" tabs={tabs} value={tab} onChange={goTab} />
        </div>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
          {tab === "overview" && <OverviewTab {...props} />}
          {tab === "spec" && <SpecTab {...props} />}
          {tab === "cost" && <CostTab {...props} />}
          {tab === "quote" && <QuoteTab {...props} />}
          {tab === "review" && <ReviewTab {...props} />}
          {tab === "bom" && <BomTab {...props} />}
          {tab === "purchase" && <PurchaseTab {...props} />}
          {tab === "production" && <ProductionTab {...props} />}
          {tab === "shipment" && <ShipmentTab {...props} />}
          {tab === "after" && <AfterTab {...props} />}
          {tab === "docs" && <DocumentsTab {...props} />}
          {tab === "history" && <HistoryTab {...props} />}
        </motion.div>
      </AnimatePresence>

      <OrderModal c={c} open={orderOpen} onClose={() => setOrderOpen(false)} onIssued={(w) => setIssued(w)} />
      <WorkNoIssuedModal
        c={c}
        workNo={issued}
        onClose={() => {
          setIssued(null);
          goTab("bom");
        }}
      />
    </div>
  );
}

function HeaderActions({ c, latestQuoteId }: { c: Case; latestQuoteId?: string }) {
  const router = useRouter();
  const canEdit = useCan("editCase");
  const setStatus = useStore((s) => s.setCaseStatus);
  const [menu, setMenu] = useState(false);
  const [statusModal, setStatusModal] = useState<null | "lost" | "onhold">(null);
  const [reason, setReason] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items: { label: string; icon: React.ReactNode; onClick: () => void; show: boolean; danger?: boolean }[] = [
    { label: "仕様書を印刷", icon: <Printer size={14} />, onClick: () => window.open(`/print/spec/${c.id}`, "_blank"), show: true },
    { label: "最新の見積書を印刷", icon: <Printer size={14} />, onClick: () => window.open(`/print/quote/${latestQuoteId}`, "_blank"), show: !!latestQuoteId },
    { label: "社内注文書（工事指示書）を印刷", icon: <Printer size={14} />, onClick: () => window.open(`/print/order/${c.id}`, "_blank"), show: !!c.workNo },
    { label: "類似案件・原価を比較", icon: <GitCompare size={14} />, onClick: () => router.push(`/search?case=${c.id}`), show: true },
    { label: "この案件を元に新規引合", icon: <Copy size={14} />, onClick: () => router.push(`/cases/new?from=${c.id}`), show: canEdit },
    { label: "保留にする", icon: <PauseCircle size={14} />, onClick: () => setStatusModal("onhold"), show: canEdit && c.status === "active" && !c.order },
    { label: "失注として登録", icon: <XCircle size={14} />, onClick: () => setStatusModal("lost"), show: canEdit && c.status === "active" && !c.order, danger: true },
    {
      label: "進行中に戻す",
      icon: <PlayCircle size={14} />,
      onClick: () => {
        setStatus(c.id, "active");
        toast.success("案件を進行中に戻しました");
      },
      show: canEdit && (c.status === "onhold" || c.status === "lost"),
    },
  ];

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <Button icon={<GitCompare size={15} />} onClick={() => router.push(`/search?case=${c.id}`)} className="hidden md:inline-flex">
        類似案件を探す
      </Button>
      <Button icon={<MoreHorizontal size={15} />} onClick={() => setMenu((m) => !m)}>
        操作
      </Button>
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-xl"
          >
            {items
              .filter((i) => i.show)
              .map((i) => (
                <button
                  key={i.label}
                  onClick={() => {
                    setMenu(false);
                    i.onClick();
                  }}
                  className={cn("flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-stone-50", i.danger ? "text-rose-700" : "text-stone-700")}
                >
                  <span className="text-stone-400">{i.icon}</span>
                  {i.label}
                </button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>
      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={statusModal === "lost" ? "失注として登録" : "案件を保留にする"}
        description={statusModal === "lost" ? "失注理由は今後の見積精度向上のために分析されます。" : "保留理由と再開予定を記録しておくと、引継ぎがスムーズになります。"}
        size="sm"
        footer={
          <>
            <Button onClick={() => setStatusModal(null)}>キャンセル</Button>
            <Button
              variant={statusModal === "lost" ? "danger" : "primary"}
              onClick={() => {
                if (statusModal === "lost" && !reason.trim()) {
                  toast.error("失注理由を入力してください");
                  return;
                }
                setStatus(c.id, statusModal!, reason.trim() || undefined);
                toast.success(statusModal === "lost" ? "失注として登録しました" : "案件を保留にしました");
                setStatusModal(null);
                setReason("");
              }}
            >
              登録する
            </Button>
          </>
        }
      >
        <Field label={statusModal === "lost" ? "失注理由" : "保留理由・再開予定"} required={statusModal === "lost"}>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={statusModal === "lost" ? "例：価格差（競合比 約10%高）、納期対応不可 など" : "例：客先の予算確定待ち。2月に再提案予定。"} />
        </Field>
      </Modal>
    </div>
  );
}
