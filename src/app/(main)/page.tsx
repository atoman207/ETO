"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Hash,
  JapaneseYen,
  ShoppingCart,
  Stamp,
  TrendingUp,
  Wrench,
  Factory,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { can, useCurrentUser, useLookups } from "@/lib/hooks";
import { daysFromToday, fmtDate, fmtWareki, manYen, relTime, today, toDate, ymd, cn } from "@/lib/format";
import { EQUIPMENT_TYPES, SERVICE_STATUS, SERVICE_TYPES, STAGES } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, StageBadge } from "@/components/ui/badge";
import { Avatar, CountUp, DueLabel, ProgressBar } from "@/components/ui/misc";

const PROB_WEIGHT = { A: 0.8, B: 0.5, C: 0.2 };

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "お疲れさまです";
}

export default function DashboardPage() {
  const cases = useStore((s) => s.cases);
  const quotes = useStore((s) => s.quotes);
  const services = useStore((s) => s.services);
  const activities = useStore((s) => s.activities);
  const pos = useStore((s) => s.purchaseOrders);
  const equipment = useStore((s) => s.equipment);
  const me = useCurrentUser();
  const lk = useLookups();
  const t = today();

  const data = useMemo(() => {
    const now = toDate(t);
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = `${fyStartYear}-04-01`;
    const active = cases.filter((c) => c.status === "active");
    const preOrder = active.filter((c) => !c.order);
    const pipeline = preOrder.reduce((s, c) => s + c.expectedAmount * PROB_WEIGHT[c.probability], 0);
    const orders = cases.filter((c) => c.order);
    const fyOrders = orders.filter((c) => c.order!.orderDate >= fyStart);
    const fyOrderAmount = fyOrders.reduce((s, c) => s + c.order!.orderAmount, 0);
    const backlog = cases.filter((c) => c.workNo && c.stage !== "aftercare");
    const backlogAmount = backlog.reduce((s, c) => s + (c.order?.orderAmount ?? 0), 0);
    const openSvc = services.filter((s) => s.status !== "done");

    const months: { key: string; label: string; amount: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = ymd(d).slice(0, 7);
      months.push({ key, label: `${d.getMonth() + 1}月`, amount: 0, count: 0 });
    }
    orders.forEach((c) => {
      const m = months.find((x) => x.key === c.order!.orderDate.slice(0, 7));
      if (m) {
        m.amount += c.order!.orderAmount / 10000;
        m.count += 1;
      }
    });

    const byStage = STAGES.filter((s) => s.key !== "aftercare").map((s) => {
      const list = active.filter((c) => c.stage === s.key);
      return { ...s, count: list.length, amount: list.reduce((sum, c) => sum + c.expectedAmount, 0) };
    });
    const maxStage = Math.max(1, ...byStage.map((s) => s.count));

    const upcoming = cases
      .filter((c) => c.order && c.stage !== "aftercare" && c.status === "active")
      .map((c) => ({ c, d: daysFromToday(c.order!.deliveryDate) ?? 999 }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 6);

    return { active, preOrder, pipeline, fyOrderAmount, fyOrders, backlog, backlogAmount, openSvc, months, byStage, maxStage, upcoming, fyStartYear };
  }, [cases, services, t]);

  const tasks = useMemo(() => {
    const list: { icon: React.ReactNode; tone: string; title: string; sub: string; href: string }[] = [];
    if (!me) return list;
    if (can(me, "approve")) {
      quotes
        .filter((q) => q.status === "pending")
        .forEach((q) => {
          const step = q.approvals.find((a) => a.status === "waiting");
          if (step && step.level <= me.approvalLevel && step.level > 0) {
            const c = lk.case.get(q.caseId);
            list.push({ icon: <Stamp size={15} />, tone: "bg-amber-100 text-amber-700", title: `見積承認（${step.label}）`, sub: `${q.quoteNo} ${c?.title ?? ""}`, href: `/cases/${q.caseId}?tab=quote` });
          }
        });
      cases
        .filter((c) => c.review.status === "pending" && c.status === "active")
        .forEach((c) => {
          const step = c.review.approvals.find((a) => a.status === "waiting");
          if (step && step.level <= me.approvalLevel) {
            list.push({ icon: <ClipboardCheck size={15} />, tone: "bg-violet-100 text-violet-700", title: `取引審査（${step.label}承認）`, sub: `${c.dealNo} ${c.title}`, href: `/cases/${c.id}?tab=review` });
          }
        });
    }
    cases
      .filter((c) => c.stage === "ordered" && !c.workNo && c.status === "active")
      .forEach((c) => list.push({ icon: <Hash size={15} />, tone: "bg-orange-100 text-orange-700", title: "工番未発行", sub: `${c.dealNo} ${c.title}`, href: `/cases/${c.id}` }));
    cases.forEach((c) =>
      c.processes
        .filter((p) => p.status === "delayed")
        .forEach((p) => list.push({ icon: <AlertTriangle size={15} />, tone: "bg-rose-100 text-rose-700", title: `工程遅延：${p.name}`, sub: `${c.workNo} ${c.title}`, href: `/cases/${c.id}?tab=production` })),
    );
    if (can(me, "purchase")) {
      const req = pos.filter((p) => p.status === "requested");
      if (req.length) list.push({ icon: <ShoppingCart size={15} />, tone: "bg-lime-100 text-lime-800", title: `未発注の購買依頼 ${req.length}件`, sub: "購買管理で発注処理を行ってください", href: "/purchasing" });
    }
    services
      .filter((s) => s.status !== "done" && (s.assigneeId === me.id || can(me, "editService")))
      .slice(0, 3)
      .forEach((s) => list.push({ icon: <Wrench size={15} />, tone: "bg-sky-100 text-sky-700", title: `サービス対応：${SERVICE_STATUS[s.status].label}`, sub: `${s.ticketNo} ${s.title}`, href: `/service/${s.id}` }));
    return list;
  }, [me, quotes, cases, pos, services, lk]);

  const kpis = [
    { label: "進行中の案件", value: data.active.length, unit: "件", sub: `うち受注前 ${data.preOrder.length}件`, icon: <Briefcase size={18} />, href: "/cases", tone: "text-ai-700 bg-ai-50" },
    { label: "見込み受注額（確度加重）", value: data.pipeline / 10000, unit: "万円", sub: "確度 A80%・B50%・C20% で算出", icon: <TrendingUp size={18} />, href: "/cases", tone: "text-indigo-700 bg-indigo-50" },
    { label: `今期受注額（${data.fyStartYear}年4月〜）`, value: data.fyOrderAmount / 10000, unit: "万円", sub: `受注 ${data.fyOrders.length}件`, icon: <JapaneseYen size={18} />, href: "/cases", tone: "text-shu-600 bg-shu-50" },
    { label: "受注残（工番発行済）", value: data.backlog.length, unit: "件", sub: `金額 ${manYen(data.backlogAmount)}`, icon: <Factory size={18} />, href: "/production", tone: "text-emerald-700 bg-emerald-50" },
    { label: "アフターサービス対応中", value: data.openSvc.length, unit: "件", sub: `納入装置 ${equipment.length}台を管理`, icon: <Wrench size={18} />, href: "/service", tone: "text-violet-700 bg-violet-50" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-stone-500">
            {fmtDate(t)}　{fmtWareki(t)}
          </p>
          <h1 className="mt-0.5 text-xl font-bold text-stone-900">
            {greeting()}、{me?.name.split(" ")[0]}さん
          </h1>
          <p className="mt-0.5 text-[13px] text-stone-500">引合から納品・アフターサービスまで、全案件の状況をひと目で確認できます。</p>
        </div>
        <Link href="/proposal" className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs text-ai-800 ring-1 ring-ai-200 transition hover:bg-ai-50">
          本デモの構成・ご提案内容を見る
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <Link href={k.href} className="group block h-full rounded-lg border border-stone-200/90 bg-white p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-ai-200 hover:shadow-[var(--shadow-lift)]">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-stone-500">{k.label}</span>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", k.tone)}>{k.icon}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <CountUp value={k.value} className="text-[26px] font-bold tracking-tight text-stone-900" />
                <span className="text-xs text-stone-500">{k.unit}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-stone-500">{k.sub}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="案件パイプライン" description="進行中案件のステージ別件数と見込金額（クリックで一覧へ）" icon={<Briefcase size={17} />} />
          <div className="grid gap-x-6 gap-y-1.5 px-5 py-4 sm:grid-cols-2">
            {data.byStage.map((s, i) => (
              <Link key={s.key} href={`/cases?stage=${s.key}`} className="group grid grid-cols-[112px_1fr_auto] items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-stone-50">
                <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-stone-600">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", s.dot)} />
                  {s.label}
                </span>
                <div className="h-5 overflow-hidden rounded bg-stone-100">
                  <motion.div
                    className="flex h-full items-center rounded bg-ai-600/85 pl-2 text-[10px] font-bold text-white group-hover:bg-ai-700"
                    initial={{ width: 0 }}
                    animate={{ width: `${s.count ? Math.max(10, (s.count / data.maxStage) * 100) : 0}%` }}
                    transition={{ delay: 0.15 + i * 0.04, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {s.count > 0 && `${s.count}件`}
                  </motion.div>
                </div>
                <span className="font-num w-20 text-right text-xs text-stone-600">{s.count ? manYen(s.amount) : "—"}</span>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="対応が必要なタスク" description={`${me?.name}さんの権限で処理できる項目`} icon={<CheckCircle2 size={17} />} actions={<Badge className="bg-shu-50 text-shu-700 ring-shu-200">{tasks.length}件</Badge>} />
          <div className="scroll-thin max-h-[330px] overflow-y-auto">
            {tasks.length === 0 && <div className="px-5 py-10 text-center text-xs text-stone-500">現在、対応が必要なタスクはありません</div>}
            {tasks.map((tk, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.03 }}>
                <Link href={tk.href} className="flex items-center gap-3 border-b border-stone-50 px-5 py-2.5 transition-colors hover:bg-stone-50">
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tk.tone)}>{tk.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-stone-800">{tk.title}</span>
                    <span className="block truncate text-[11px] text-stone-500">{tk.sub}</span>
                  </span>
                  <ArrowRight size={14} className="text-stone-300" />
                </Link>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="月別受注金額" description="直近12ヶ月（受注日ベース、単位：万円）" icon={<TrendingUp size={17} />} />
          <div className="h-[260px] px-3 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.months} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#efece4" />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#e2ddd0" }} tick={{ fontSize: 11, fill: "#78716c" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#78716c" }} width={52} tickFormatter={(v: number) => v.toLocaleString()} />
                <Tooltip
                  cursor={{ fill: "rgba(31,90,128,0.06)" }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="rounded-md border border-stone-200 bg-white px-3 py-2 text-xs shadow-lg">
                        <div className="font-medium text-stone-700">{label}</div>
                        <div className="font-num mt-0.5 text-stone-900">{Math.round(Number(payload[0].value)).toLocaleString()} 万円</div>
                        <div className="text-stone-500">受注 {(payload[0].payload as { count: number }).count} 件</div>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="amount" fill="#1f5a80" radius={[4, 4, 0, 0]} maxBarSize={34} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="納期が近い受注案件" icon={<CalendarClock size={17} />} actions={<Link href="/production" className="text-xs text-ai-700 hover:underline">製造進捗へ</Link>} />
          <div>
            {data.upcoming.map(({ c }) => {
              const prog = c.processes.length ? Math.round(c.processes.reduce((s, p) => s + p.progress, 0) / c.processes.length) : 0;
              return (
                <Link key={c.id} href={`/cases/${c.id}`} className="block border-b border-stone-50 px-5 py-2.5 transition-colors hover:bg-stone-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-num text-[11px] font-semibold text-ai-700">{c.workNo ?? c.dealNo}</span>
                    <StageBadge stage={c.stage} />
                  </div>
                  <div className="mt-0.5 truncate text-[13px] font-medium text-stone-800">{c.title}</div>
                  <div className="mt-1 flex items-center gap-3">
                    <ProgressBar value={prog} className="flex-1" height={5} />
                    <span className="text-[11px]">
                      <DueLabel date={c.order!.deliveryDate} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="最近の更新" description="全部門の操作履歴（引継ぎ・情報共有に活用）" icon={<ClipboardCheck size={17} />} />
          <ol className="relative px-5 py-3">
            {activities.slice(0, 10).map((a, i) => {
              const u = lk.user.get(a.userId);
              const c = a.caseId ? lk.case.get(a.caseId) : undefined;
              return (
                <motion.li key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < 9 && <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-stone-200" />}
                  <Avatar user={u} size={26} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-stone-700">
                      <span className="font-medium text-stone-900">{u?.name}</span>　{a.message}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
                      <span>{relTime(a.at)}</span>
                      {c && (
                        <Link href={`/cases/${c.id}`} className="font-num text-ai-700 hover:underline">
                          {c.workNo ?? c.dealNo} {c.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </Card>

        <Card>
          <CardHeader title="アフターサービス対応状況" icon={<Cpu size={17} />} actions={<Link href="/service" className="text-xs text-ai-700 hover:underline">一覧へ</Link>} />
          <div>
            {data.openSvc.length === 0 && <div className="px-5 py-8 text-center text-xs text-stone-500">対応中の案件はありません</div>}
            {data.openSvc.map((s) => {
              const eq = lk.equipment.get(s.equipmentId);
              return (
                <Link key={s.id} href={`/service/${s.id}`} className="block border-b border-stone-50 px-5 py-2.5 transition-colors hover:bg-stone-50">
                  <div className="flex items-center gap-2">
                    <Badge className={SERVICE_TYPES[s.type].color}>{SERVICE_TYPES[s.type].label}</Badge>
                    <Badge className={SERVICE_STATUS[s.status].color}>{SERVICE_STATUS[s.status].label}</Badge>
                    <span className="font-num ml-auto text-[11px] text-stone-400">{s.ticketNo}</span>
                  </div>
                  <div className="mt-1 truncate text-[13px] font-medium text-stone-800">{s.title}</div>
                  <div className="truncate text-[11px] text-stone-500">
                    {lk.customer.get(eq?.customerId ?? "")?.name}／{eq?.serialNo} {eq ? EQUIPMENT_TYPES[eq.equipmentType].label : ""}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
