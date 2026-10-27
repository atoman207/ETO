"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import { cn, fmtDate, surname, toDate, yen } from "@/lib/format";
import { useCan } from "@/lib/hooks";
import type { ApprovalStep, FileType, User } from "@/lib/types";
import { FILE_TYPES } from "@/lib/constants";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  icon?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {breadcrumbs && (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-stone-500">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-stone-400" />}
              {b.href ? (
                <Link href={b.href} className="transition-colors hover:text-ai-700 hover:underline">
                  {b.label}
                </Link>
              ) : (
                <span className="text-stone-700">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ai-700 text-white shadow-sm">{icon}</div>}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-wide text-stone-900">{title}</h1>
            {description && <p className="mt-0.5 text-[13px] text-stone-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kinari-dark/70 text-stone-400">{icon}</div>}
      <p className="text-sm font-medium text-stone-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Avatar({ user, size = 28, className }: { user?: User; size?: number; className?: string }) {
  if (!user) return <span className={cn("inline-block rounded-full bg-stone-200", className)} style={{ width: size, height: size }} />;
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ring-2 ring-white", className)}
      style={{ width: size, height: size, background: user.color, fontSize: size * 0.42 }}
      title={`${user.name}（${user.dept}${user.title ? " " + user.title : ""}）`}
    >
      {surname(user.name).slice(0, 1)}
    </span>
  );
}

export function UserChip({ user, sub }: { user?: User; sub?: boolean }) {
  if (!user) return <span className="text-stone-400">未割当</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar user={user} size={20} className="ring-0" />
      <span className="text-[13px]">{user.name}</span>
      {sub && <span className="text-[11px] text-stone-400">{user.dept}</span>}
    </span>
  );
}

export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString("ja-JP"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(format(0));
  const prev = useRef(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(prev.current, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(format(v)),
    });
    prev.current = value;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, inView]);
  return (
    <span ref={ref} className={cn("font-num", className)}>
      {display}
    </span>
  );
}

export function ProgressBar({ value, className, color = "bg-ai-600", height = 6 }: { value: number; className?: string; color?: string; height?: number }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-stone-200/70", className)} style={{ height }}>
      <motion.div
        className={cn("h-full rounded-full", color)}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/** 印鑑（承認印） */
export function Hanko({ name, size = 46, animateIn = true, date }: { name: string; size?: number; animateIn?: boolean; date?: string }) {
  const sn = surname(name);
  return (
    <motion.div
      initial={animateIn ? { scale: 1.7, opacity: 0, rotate: -20 } : false}
      animate={{ scale: 1, opacity: 0.92, rotate: -8 }}
      transition={{ type: "spring", stiffness: 420, damping: 16, mass: 0.8 }}
      className="relative flex items-center justify-center rounded-full border-[2px] border-inshu text-inshu"
      style={{ width: size, height: size, boxShadow: "inset 0 0 0 1px rgba(200,16,46,0.25)" }}
      title={`${name}${date ? ` ${date}` : ""}`}
    >
      <span className="font-mincho font-bold leading-none" style={{ writingMode: "vertical-rl", fontSize: sn.length > 2 ? size * 0.26 : size * 0.34, letterSpacing: "0.02em" }}>
        {sn}
      </span>
    </motion.div>
  );
}

export function ApprovalStamps({ steps, users, compact }: { steps: ApprovalStep[]; users: Map<string, User>; compact?: boolean }) {
  const size = compact ? 38 : 48;
  return (
    <div className="inline-flex overflow-hidden rounded border border-stone-300 bg-white">
      {steps.map((s, i) => {
        const u = s.userId ? users.get(s.userId) : undefined;
        return (
          <div key={i} className={cn("flex flex-col items-center", i > 0 && "border-l border-stone-300")} style={{ width: size + 22 }}>
            <div className="w-full border-b border-stone-300 bg-stone-50 py-0.5 text-center text-[10px] text-stone-600">{s.label}</div>
            <div className="flex items-center justify-center" style={{ height: size + 12 }}>
              {s.status === "approved" && u ? (
                <Hanko name={u.name} size={size} />
              ) : s.status === "rejected" ? (
                <motion.span initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded border-2 border-rose-600 px-1 text-[11px] font-bold text-rose-600">
                  差戻
                </motion.span>
              ) : (
                <span className="text-[10px] text-stone-300">未承認</span>
              )}
            </div>
            <div className="font-num w-full border-t border-stone-200 py-0.5 text-center text-[10px] text-stone-500">
              {s.at ? `${toDate(s.at).getMonth() + 1}/${toDate(s.at).getDate()}` : "　"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 原価：閲覧権限がない場合はマスク表示 */
export function Cost({ value, className, masked = "＊＊＊" }: { value: number | undefined; className?: string; masked?: string }) {
  const ok = useCan("viewCost");
  if (!ok)
    return (
      <span className={cn("inline-flex items-center gap-1 text-stone-400", className)} title="原価の閲覧権限がありません">
        <Lock size={11} />
        {masked}
      </span>
    );
  return <span className={cn("font-num", className)}>{yen(value)}</span>;
}

export function DL({ items, cols = 2, className }: { items: { label: string; value: ReactNode; full?: boolean }[]; cols?: 1 | 2 | 3 | 4; className?: string }) {
  const grid = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" }[cols];
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3", grid, className)}>
      {items.map((it, i) => (
        <div key={i} className={cn("min-w-0", it.full && "sm:col-span-full")}>
          <dt className="text-[11px] font-medium text-stone-500">{it.label}</dt>
          <dd className="mt-0.5 break-words text-[13px] text-stone-800">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FileBadge({ type }: { type: FileType }) {
  const f = FILE_TYPES[type];
  const short = { pdf: "PDF", xlsx: "XLS", docx: "DOC", dwg: "CAD", jpg: "IMG", gdoc: "文書", gsheet: "表", zip: "ZIP" }[type];
  return <span className={cn("inline-flex h-7 w-9 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white shadow-sm", f.color)}>{short}</span>;
}

export function DueLabel({ date, doneLabel }: { date?: string; doneLabel?: string }) {
  if (!date) return <span className="text-stone-400">—</span>;
  if (doneLabel) return <span className="text-stone-500">{fmtDate(date, false)}</span>;
  const d = Math.round((toDate(date).getTime() - toDate(new Date().toISOString().slice(0, 10)).getTime()) / 86400000);
  const tone = d < 0 ? "text-rose-700 font-medium" : d <= 14 ? "text-shu-600 font-medium" : "text-stone-700";
  return (
    <span className={cn("font-num whitespace-nowrap", tone)}>
      {fmtDate(date, false)}
      <span className="ml-1 text-[11px]">{d < 0 ? `（${-d}日超過）` : d === 0 ? "（本日）" : `（あと${d}日）`}</span>
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h4 className="flex items-center gap-2 text-[13px] font-bold text-stone-700">
        <span className="h-3.5 w-1 rounded-full bg-shu-500" />
        {children}
      </h4>
      {action}
    </div>
  );
}

export function Seigaiha({ className, stroke = "rgba(255,255,255,0.09)", fill = "#173a54", id = "sg" }: { className?: string; stroke?: string; fill?: string; id?: string }) {
  const r = 20;
  const centers: [number, number][] = [
    [r, -r / 2],
    [0, 0],
    [2 * r, 0],
    [r, r / 2],
    [0, r],
    [2 * r, r],
    [r, (3 * r) / 2],
  ];
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width={2 * r} height={r} patternUnits="userSpaceOnUse">
          {centers.map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} />
              <circle cx={cx} cy={cy} r={r * 0.75} fill="none" stroke={stroke} strokeWidth={1} />
              <circle cx={cx} cy={cy} r={r * 0.5} fill="none" stroke={stroke} strokeWidth={1} />
              <circle cx={cx} cy={cy} r={r * 0.25} fill="none" stroke={stroke} strokeWidth={1} />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-md bg-inshu text-white shadow-md shadow-black/20"
      style={{ width: size, height: size }}
    >
      <span className="font-mincho font-bold leading-none" style={{ fontSize: size * 0.58 }}>
        匠
      </span>
      <span className="absolute inset-[3px] rounded-[4px] border border-white/40" />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}

export function LockedNotice({ message = "この操作を行う権限がありません" }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-500">
      <Lock size={13} />
      {message}
    </div>
  );
}
