"use client";

import { motion } from "framer-motion";

interface Entity {
  key: string;
  col: number;
  row: number;
  title: string;
  no?: string;
  fields: string[];
  tone: "ai" | "shu" | "emerald" | "stone" | "violet";
}

const ENTITIES: Entity[] = [
  { key: "cust", col: 0, row: 0, title: "顧客", no: "顧客コード", fields: ["業種・与信ランク", "支払条件・担当営業"], tone: "ai" },
  { key: "site", col: 1, row: 0, title: "拠点（納入先）", fields: ["所在地", "ご担当者（複数）"], tone: "ai" },
  { key: "case", col: 2, row: 0, title: "案件", no: "取引番号", fields: ["仕様（構造化）・原価", "ステージ・審査・メモ"], tone: "ai" },
  { key: "quote", col: 3, row: 0, title: "見積", no: "見積番号（版数）", fields: ["明細・原価・値引", "承認（担当→課長→部長）"], tone: "ai" },
  { key: "tpl", col: 4, row: 0, title: "標準モジュール", fields: ["BOMテンプレート", "ユニット構成"], tone: "stone" },
  { key: "user", col: 0, row: 1, title: "社員・ロール", fields: ["部署・役職・承認段階", "権限（原価閲覧 等）"], tone: "stone" },
  { key: "eq", col: 1, row: 1, title: "装置（納入実績）", no: "製造番号", fields: ["仕様スナップショット", "設置場所・保証期限"], tone: "emerald" },
  { key: "work", col: 2, row: 1, title: "受注・工番", no: "工事番号", fields: ["客先注文番号・納期", "製造工程計画"], tone: "shu" },
  { key: "bom", col: 3, row: 1, title: "BOM明細", fields: ["階層構造（ユニット/部品）", "数量・単価・手配区分"], tone: "shu" },
  { key: "part", col: 4, row: 1, title: "品目マスタ", no: "品番", fields: ["標準単価・LT", "標準仕入先"], tone: "stone" },
  { key: "log", col: 0, row: 2, title: "操作履歴", fields: ["誰が・いつ・何を", "監査・引継ぎ"], tone: "stone" },
  { key: "svc", col: 1, row: 2, title: "サービス履歴", no: "受付番号", fields: ["修理・改造・部品交換", "原因・処置・費用"], tone: "violet" },
  { key: "doc", col: 2, row: 2, title: "資料（Google Drive）", fields: ["ファイルID・フォルダ", "版数・更新者"], tone: "stone" },
  { key: "po", col: 3, row: 2, title: "発注", no: "発注番号", fields: ["発注明細（BOM行と紐付）", "納期・入荷状況"], tone: "shu" },
  { key: "sup", col: 4, row: 2, title: "仕入先マスタ", fields: ["取扱分類・評価", "納期遵守率"], tone: "stone" },
];

const REL: [string, string, string][] = [
  ["cust", "site", "1 : n"],
  ["site", "case", "1 : n"],
  ["case", "quote", "1 : n"],
  ["case", "work", "1 : 1"],
  ["work", "bom", "1 : n"],
  ["bom", "part", "n : 1"],
  ["tpl", "part", "n : n"],
  ["bom", "po", "n : 1"],
  ["po", "sup", "n : 1"],
  ["part", "sup", "n : 1"],
  ["work", "eq", "1 : n"],
  ["site", "eq", "1 : n"],
  ["eq", "svc", "1 : n"],
  ["work", "doc", "1 : n"],
  ["svc", "doc", "1 : n"],
];

const W = 156;
const H = 104;
const GX = 200;
const GY = 168;
const X0 = 10;
const Y0 = 14;
const TONE = {
  ai: { head: "var(--color-ai-700)", body: "var(--color-ai-50)", stroke: "var(--color-ai-300)" },
  shu: { head: "var(--color-shu-600)", body: "var(--color-shu-50)", stroke: "var(--color-shu-300)" },
  emerald: { head: "var(--color-emerald-700)", body: "var(--color-emerald-50)", stroke: "var(--color-emerald-300)" },
  violet: { head: "var(--color-violet-700)", body: "var(--color-violet-50)", stroke: "var(--color-violet-300)" },
  stone: { head: "var(--color-stone-600)", body: "var(--color-stone-50)", stroke: "var(--color-stone-300)" },
};

export function ErDiagram() {
  const pos = (k: string) => {
    const e = ENTITIES.find((x) => x.key === k)!;
    return { x: X0 + e.col * GX, y: Y0 + e.row * GY, e };
  };
  return (
    <div className="scroll-thin overflow-x-auto">
      <svg viewBox="0 0 970 470" className="min-w-[860px]" role="img" aria-label="データ構造図">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" style={{ fill: "var(--color-stone-400)" }} />
          </marker>
        </defs>
        {REL.map(([a, b, label], i) => {
          const p = pos(a);
          const q = pos(b);
          let x1, y1, x2, y2;
          if (p.e.row === q.e.row) {
            const leftToRight = p.e.col < q.e.col;
            x1 = leftToRight ? p.x + W : p.x;
            x2 = leftToRight ? q.x : q.x + W;
            y1 = p.y + H / 2;
            y2 = q.y + H / 2;
          } else if (p.e.col === q.e.col) {
            const down = p.e.row < q.e.row;
            x1 = p.x + W / 2;
            x2 = q.x + W / 2;
            y1 = down ? p.y + H : p.y;
            y2 = down ? q.y : q.y + H;
          } else {
            x1 = p.x + (p.e.col < q.e.col ? W : 0);
            y1 = p.y + H / 2;
            x2 = q.x + W / 2;
            y2 = q.y;
          }
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          return (
            <g key={i}>
              <motion.line x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: "var(--color-stone-400)" }} strokeWidth={1.5} markerEnd="url(#arrow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }} />
              <rect x={mx - 19} y={my - 9} width={38} height={18} rx={9} style={{ fill: "var(--color-surface)", stroke: "var(--color-stone-200)" }} />
              <text x={mx} y={my + 4} textAnchor="middle" fontSize={10} style={{ fill: "var(--color-stone-600)" }} fontFamily="var(--font-sans)">
                {label}
              </text>
            </g>
          );
        })}
        {ENTITIES.map((e, i) => {
          const x = X0 + e.col * GX;
          const y = Y0 + e.row * GY;
          const t = TONE[e.tone];
          return (
            <motion.g key={e.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <rect x={x} y={y} width={W} height={H} rx={8} style={{ fill: t.body, stroke: t.stroke }} />
              <path d={`M${x} ${y + 8} a8 8 0 0 1 8 -8 h${W - 16} a8 8 0 0 1 8 8 v22 h-${W} z`} style={{ fill: t.head }} />
              <text x={x + 10} y={y + 20} fontSize={12.5} fontWeight={700} fill="#fff" fontFamily="var(--font-sans)">
                {e.title}
              </text>
              {e.no && (
                <text x={x + 10} y={y + 47} fontSize={11} fontWeight={700} style={{ fill: t.head }} fontFamily="var(--font-sans)">
                  🔑 {e.no}
                </text>
              )}
              {e.fields.map((f, fi) => (
                <text key={f} x={x + 10} y={y + (e.no ? 66 : 50) + fi * 17} fontSize={10.5} style={{ fill: "var(--color-stone-700)" }} fontFamily="var(--font-sans)">
                  ・{f}
                </text>
              ))}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

export function ArchitectureDiagram() {
  const Box = ({ title, sub, items, tone, delay = 0 }: { title: string; sub?: string; items: string[]; tone: string; delay?: number }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }} className={`rounded-lg border-2 bg-surface p-3 ${tone}`}>
      <div className="text-[0.8125rem] font-bold">{title}</div>
      {sub && <div className="text-[0.625rem] text-stone-500">{sub}</div>}
      <ul className="mt-1.5 space-y-0.5 text-[0.6875rem] text-stone-700">
        {items.map((i) => (
          <li key={i}>・{i}</li>
        ))}
      </ul>
    </motion.div>
  );
  const Arrow = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center py-1 text-[0.625rem] text-stone-500">
      <span className="h-4 w-px bg-stone-400" />
      <span className="rounded-full bg-stone-100 px-2 py-0.5">{label}</span>
      <span className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-stone-400" />
    </div>
  );
  return (
    <div className="rounded-xl bg-kinari p-4">
      <Box title="利用者（全部門）" sub="PC・タブレット・スマートフォン" items={["営業・設計・購買・製造・サービス・経営", "社外（協力会社）は原則アクセス不可"]} tone="border-stone-300" />
      <Arrow label="Google アカウントでシングルサインオン（SSO）" />
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr_1fr]">
        <div className="space-y-3">
          <Box title="現場入力（任意）" sub="AppSheet" items={["スマホでの点検・サービス報告", "写真撮影・バーコード読取"]} tone="border-emerald-300" delay={0.1} />
          <Box title="分析・帳票" sub="Looker Studio／スプレッドシート出力" items={["受注・粗利・負荷の可視化", "経営会議資料の自動作成"]} tone="border-stone-300" delay={0.15} />
        </div>
        <div className="rounded-xl border-2 border-ai-600 bg-ai-50/50 p-3">
          <div className="mb-2 text-center text-[0.8125rem] font-bold text-ai-900">業務アプリケーション（本システム）</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Box title="Web アプリ" sub="Next.js／Google Cloud Run" items={["案件・見積・審査・工番", "BOM・購買・製造進捗", "装置台帳・アフターサービス"]} tone="border-ai-300" delay={0.05} />
            <Box title="データベース" sub="Cloud SQL（PostgreSQL）" items={["構造化データの一元管理", "操作履歴（監査ログ）", "日次バックアップ・暗号化"]} tone="border-ai-300" delay={0.1} />
          </div>
        </div>
        <div className="space-y-3">
          <Box title="Google Workspace（既存）" sub="API 連携" items={["Drive：フォルダ自動作成・権限付与", "Gmail／Chat：承認依頼・通知", "カレンダー：立会検査・訪問予定"]} tone="border-shu-300" delay={0.1} />
          <Box title="既存・外部システム" sub="CSV／API 連携" items={["会計・給与パッケージ（継続利用）", "CAD 部品表出力（BOM取込）"]} tone="border-stone-300" delay={0.15} />
        </div>
      </div>
    </div>
  );
}
