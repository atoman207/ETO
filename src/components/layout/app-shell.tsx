"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  ChevronDown,
  Cpu,
  Factory,
  FolderOpen,
  GitCompare,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Wrench,
  X,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useCurrentUser } from "@/lib/hooks";
import { cn, relTime } from "@/lib/format";
import { PERMISSION_LABELS, ROLE_PERMISSIONS, ROLES } from "@/lib/constants";
import { Avatar, Logo, Seigaiha } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./command-palette";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

function useNav() {
  const services = useStore((s) => s.services);
  const quotes = useStore((s) => s.quotes);
  const cases = useStore((s) => s.cases);
  const pos = useStore((s) => s.purchaseOrders);
  return useMemo(() => {
    const openSvc = services.filter((s) => s.status !== "done").length;
    const pendingApprovals = quotes.filter((q) => q.status === "pending").length + cases.filter((c) => c.review.status === "pending" && c.status === "active").length;
    const requested = pos.filter((p) => p.status === "requested").length;
    const groups: { title: string; items: NavItem[] }[] = [
      {
        title: "メイン",
        items: [
          { href: "/", label: "ダッシュボード", icon: <LayoutDashboard size={17} /> },
          { href: "/cases", label: "案件一覧", icon: <Briefcase size={17} />, badge: pendingApprovals || undefined },
        ],
      },
      {
        title: "営業・技術",
        items: [
          { href: "/search", label: "類似案件・原価比較", icon: <GitCompare size={17} /> },
          { href: "/customers", label: "顧客・拠点", icon: <Building2 size={17} /> },
        ],
      },
      {
        title: "生産",
        items: [
          { href: "/purchasing", label: "購買管理", icon: <ShoppingCart size={17} />, badge: requested || undefined },
          { href: "/production", label: "製造進捗", icon: <Factory size={17} /> },
        ],
      },
      {
        title: "アフターサービス",
        items: [
          { href: "/equipment", label: "装置台帳", icon: <Cpu size={17} /> },
          { href: "/service", label: "修理・改造・部品", icon: <Wrench size={17} />, badge: openSvc || undefined },
        ],
      },
      {
        title: "共通",
        items: [
          { href: "/documents", label: "資料管理（Drive）", icon: <FolderOpen size={17} /> },
          { href: "/masters", label: "マスタ管理", icon: <Boxes size={17} /> },
        ],
      },
      {
        title: "導入検討",
        items: [
          { href: "/proposal", label: "ご提案資料", icon: <BookOpen size={17} /> },
          { href: "/settings", label: "設定・権限", icon: <Settings size={17} /> },
        ],
      },
    ];
    return groups;
  }, [services, quotes, cases, pos]);
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = useNav();
  const company = useStore((s) => s.settings.companyName);
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ai-900 text-ai-100">
      <Seigaiha className="pointer-events-none absolute bottom-0 left-0 h-56 w-full opacity-80 [mask-image:linear-gradient(to_top,black,transparent)]" id="sg-side" fill="#132c40" />
      <Link href="/" onClick={onNavigate} className="relative flex items-center gap-3 px-5 pb-4 pt-5">
        <Logo size={38} />
        <div>
          <div className="font-mincho text-xl font-bold leading-none tracking-[0.25em] text-white">匠帳</div>
          <div className="mt-1.5 text-[10px] leading-tight tracking-wider text-ai-300">個別受注生産<br />案件・装置統合管理</div>
        </div>
      </Link>
      <nav className="scroll-thin relative flex-1 overflow-y-auto px-3 pb-6">
        {groups.map((g) => (
          <div key={g.title} className="mt-4 first:mt-1">
            <div className="mb-1 px-3 text-[10px] font-medium tracking-[0.15em] text-ai-400">{g.title}</div>
            {g.items.map((it) => {
              const active = isActive(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative mb-0.5 flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] transition-colors",
                    active ? "text-white" : "text-ai-200 hover:bg-white/5 hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-md bg-white/12 ring-1 ring-inset ring-white/10"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  {active && <motion.span layoutId="nav-bar" className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r bg-shu-500" />}
                  <span className={cn("relative transition-colors", active ? "text-shu-300" : "text-ai-400 group-hover:text-ai-200")}>{it.icon}</span>
                  <span className="relative flex-1">{it.label}</span>
                  {it.badge ? <span className="font-num relative rounded-full bg-shu-500 px-1.5 text-[10px] font-bold leading-4 text-white">{it.badge}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="relative border-t border-white/10 px-5 py-3 text-[10px] leading-relaxed text-ai-400">
        {company}
        <br />
        デモ版 Ver.0.9
      </div>
    </div>
  );
}

function Notifications() {
  const notifications = useStore((s) => s.notifications);
  const markRead = useStore((s) => s.markNotificationRead);
  const markAll = useStore((s) => s.markAllNotificationsRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const tone = { info: "bg-sky-500", success: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-rose-500" };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative flex h-9 w-9 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-800" aria-label="お知らせ">
        <Bell size={18} />
        {unread > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-num absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-shu-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unread}
          </motion.span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-40 w-[360px] origin-top-right overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl shadow-ai-950/10"
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
              <span className="text-sm font-bold">お知らせ</span>
              <button onClick={markAll} className="text-xs text-ai-700 hover:underline">
                すべて既読にする
              </button>
            </div>
            <div className="scroll-thin max-h-[420px] overflow-y-auto">
              {notifications.length === 0 && <div className="px-4 py-8 text-center text-xs text-stone-500">お知らせはありません</div>}
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    markRead(n.id);
                    setOpen(false);
                    router.push(n.href);
                  }}
                  className={cn("flex w-full gap-3 border-b border-stone-50 px-4 py-3 text-left transition-colors hover:bg-stone-50", !n.read && "bg-ai-50/40")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone[n.tone], n.read && "opacity-30")} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("text-[13px]", n.read ? "text-stone-600" : "font-bold text-stone-800")}>{n.title}</span>
                      <span className="shrink-0 text-[10px] text-stone-400">{relTime(n.at)}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{n.body}</span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserSwitcher() {
  const users = useStore((s) => s.users);
  const setUser = useStore((s) => s.setCurrentUser);
  const me = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  if (!me) return null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-stone-900/5">
        <Avatar user={me} size={32} />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[13px] font-medium text-stone-800">{me.name}</span>
          <span className="block text-[10px] text-stone-500">
            {me.dept}
            {me.title && `・${me.title}`}
          </span>
        </span>
        <ChevronDown size={14} className="text-stone-400" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-40 w-[380px] origin-top-right overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl shadow-ai-950/10"
          >
            <div className="border-b border-stone-100 bg-shu-50/60 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-shu-700">
                <ShieldCheck size={15} />
                デモ用：ログインユーザーの切替
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-600">部署・役職によって、表示される情報（原価など）や実行できる操作、承認できる段階が変わります。</p>
            </div>
            <div className="scroll-thin max-h-[440px] overflow-y-auto py-1">
              {users.map((u) => {
                const active = u.id === me.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUser(u.id);
                      setOpen(false);
                      toast.success(`${u.name}（${u.dept}${u.title ? "・" + u.title : ""}）に切り替えました`);
                    }}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-stone-50", active && "bg-ai-50/60")}
                  >
                    <Avatar user={u} size={30} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">{u.name}</span>
                        <span className={cn("rounded px-1.5 text-[10px] leading-4", ROLES[u.role].color)}>{ROLES[u.role].label}</span>
                      </span>
                      <span className="block truncate text-[11px] text-stone-500">
                        {u.dept}
                        {u.title && `・${u.title}`}／{ROLE_PERMISSIONS[u.role].map((p) => PERMISSION_LABELS[p].label.replace(/の閲覧|・粗利/g, "")).join("・")}
                      </span>
                    </span>
                    {active && <Check size={16} className="text-ai-700" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar />
      </aside>
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-ai-950/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.div className="absolute inset-y-0 left-0 w-64" initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", damping: 30, stiffness: 300 }}>
              <Sidebar onNavigate={() => setDrawer(false)} />
              <button onClick={() => setDrawer(false)} className="absolute right-2 top-3 rounded p-1 text-ai-200 hover:bg-white/10" aria-label="閉じる">
                <X size={18} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-stone-200/80 bg-kinari/85 px-4 backdrop-blur-md sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-md p-1.5 text-stone-600 hover:bg-stone-900/5 lg:hidden" aria-label="メニュー">
            <Menu size={20} />
          </button>
          <button
            onClick={() => setPalette(true)}
            className="group flex h-9 min-w-0 flex-1 max-w-md items-center gap-2 rounded-lg border border-stone-300/80 bg-white px-3 text-left text-[13px] text-stone-400 shadow-sm transition-all hover:border-ai-300 hover:shadow"
          >
            <Search size={15} className="text-stone-400 group-hover:text-ai-600" />
            <span className="flex-1 truncate">取引番号・工事番号・製造番号・顧客名で検索…</span>
            <kbd className="hidden rounded border border-stone-200 bg-stone-50 px-1.5 font-sans text-[10px] text-stone-500 sm:inline">Ctrl + K</kbd>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button variant="accent" size="sm" icon={<Plus size={15} />} onClick={() => router.push("/cases/new")} className="hidden sm:inline-flex">
              新規引合
            </Button>
            <Notifications />
            <div className="mx-1 hidden h-6 w-px bg-stone-300 sm:block" />
            <UserSwitcher />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
