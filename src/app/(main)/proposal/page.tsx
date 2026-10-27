"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Minus, Star } from "lucide-react";
import { cn } from "@/lib/format";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody } from "@/components/ui/card";
import { ArchitectureDiagram, ErDiagram } from "@/components/proposal/diagrams";

const TOC = [
  { id: "summary", label: "はじめに" },
  { id: "requirements", label: "1. 要件整理" },
  { id: "data", label: "2. データ／マスタ構造" },
  { id: "system", label: "3. システム構成" },
  { id: "cost", label: "4. 概算費用・期間" },
  { id: "faq", label: "5. ご相談ポイントへの回答" },
  { id: "next", label: "6. 今後の進め方" },
];

const ISSUES = [
  { issue: "顧客・拠点・案件情報が複数のファイル・フォルダに分散", solution: "顧客 → 拠点 → 案件 → 装置 の階層でデータベースに一元化。ファイルは Drive の標準フォルダに自動整理", href: "/customers", label: "顧客・拠点" },
  { issue: "取引番号・見積番号と工事番号が別管理", solution: "取引番号を起点に、見積番号（版数付き）・工事番号・製造番号・サービス番号を自動採番・自動紐付け", href: "/cases", label: "案件詳細の番号チェーン" },
  { issue: "見積書・仕様書・社内注文書へ同じ情報を何度も入力", solution: "案件に一度入力した顧客・仕様・原価を、見積書・仕様書・社内注文書へ自動転記して帳票出力", href: "/cases", label: "見積・帳票" },
  { issue: "過去の類似仕様・原価・納入実績を探すのに時間がかかる", solution: "仕様パラメータ（能力・寸法・材質・環境・業種）による類似度検索と、原価構成・実績の横並び比較", href: "/search", label: "類似案件・原価比較" },
  { issue: "受注後の設計・製造情報と営業側の情報が分断", solution: "同じ案件画面で営業〜設計〜購買〜製造の情報を共有。ステージと次のアクションを全員が確認可能", href: "/production", label: "製造進捗" },
  { issue: "納品後の修理・改造・交換部品を装置単位で追いにくい", solution: "納品時に製造番号付きで装置台帳へ自動登録。仕様・BOM・サービス履歴を装置単位で蓄積し、改造は案件化", href: "/equipment", label: "装置台帳" },
  { issue: "BOM入力の負担が大きく、業務全体のボトルネック", solution: "類似案件からのユニット流用・標準モジュール展開・Excel貼付取込・品目マスタ補完の4手段で入力を削減", href: "/cases", label: "BOMエディタ" },
  { issue: "担当者の経験や記憶に依存している情報が多い", solution: "引継ぎメモ（重要事項の固定表示）・操作履歴・失注理由・原価差異を案件に蓄積し、検索・参照可能に", href: "/cases", label: "引継ぎメモ・履歴" },
];

const MASTERS = [
  ["顧客マスタ", "顧客コード・名称・フリガナ・業種・与信ランク・支払条件", "営業", "随時"],
  ["拠点マスタ", "拠点名・所在地・ご担当者（複数）", "営業", "随時"],
  ["品目マスタ", "品番・品名・型式・メーカー・標準単価・LT・標準仕入先", "購買・設計", "随時／単価は四半期見直し"],
  ["仕入先マスタ", "コード・名称・取扱分類・評価・連絡先", "購買", "随時"],
  ["標準モジュール", "ユニット単位のBOMテンプレート（制御盤・安全柵 等）", "設計", "案件完了時に登録"],
  ["社員・ロール", "部署・役職・承認段階・権限（Google Workspace と同期）", "管理部", "人事異動時（自動同期）"],
  ["区分マスタ", "装置種別・材質・制御方式・設置環境・オプション", "設計・管理部", "必要時"],
];

const OPTIONS = [
  {
    key: "A",
    title: "Google Workspace 中心（AppSheet＋スプレッドシート＋GAS）",
    pros: ["初期費用が最も小さい", "既存環境のみで開始でき、内製化しやすい", "スマホ入力が容易"],
    cons: ["データ量・同時編集が増えると速度低下", "BOMの階層構造や複雑な権限制御が苦手", "長期（10年以上）の履歴管理に不安"],
    cost: "初期 400〜800万円／4〜6ヶ月",
    fit: 2,
  },
  {
    key: "B",
    title: "Web アプリ＋クラウドDB＋Google Workspace 連携（推奨）",
    pros: ["ETO の業務フロー・番号体系に合わせて設計可能", "BOM階層・類似検索・権限を柔軟に実装", "Drive／Gmail／SSO と連携し既存資産を活用"],
    cons: ["A案より初期費用が大きい", "保守体制（外部＋社内）の整備が必要"],
    cost: "初期 1,200〜2,200万円／8〜11ヶ月",
    fit: 3,
    recommended: true,
  },
  {
    key: "C",
    title: "ETO 対応パッケージ ERP の導入＋周辺カスタマイズ",
    pros: ["会計・在庫まで含めた統合が可能", "ベンダーの保守・法改正対応"],
    cons: ["個別受注の柔軟な仕様管理はカスタマイズ前提", "ライセンス費用が継続的に発生", "業務をパッケージに合わせる必要"],
    cost: "初期 2,000〜5,000万円／12〜18ヶ月＋年間ライセンス",
    fit: 2,
  },
];

const SPLIT = [
  ["会計・給与・勤怠", "既存パッケージ／SaaS を継続", "法改正対応が多く、差別化領域ではないため", "erp"],
  ["販売管理（請求・入金）", "既存パッケージ／SaaS", "受注・納品データを CSV／API で連携", "erp"],
  ["在庫管理（汎用部品）", "既存または簡易機能", "個別受注では案件別手配が中心のため最小限", "erp"],
  ["引合〜見積〜取引審査", "個別開発", "仕様検討・版管理・承認が ETO 特有", "dev"],
  ["工番・BOM・購買手配", "個別開発", "案件ごとの階層BOMと流用が競争力の源泉", "dev"],
  ["製造工程・進捗", "個別開発（簡易）", "工番単位の工程計画と進捗共有", "dev"],
  ["装置台帳・アフターサービス", "個別開発", "製造番号単位の長期履歴が差別化領域", "dev"],
  ["ファイル保管・共同編集", "Google Drive", "既存契約を活用、API で自動整理", "gws"],
  ["現場のスマホ入力・点検", "AppSheet（任意）", "内製で画面追加しやすい", "gws"],
];

const PHASES = [
  { name: "要件定義・業務設計", months: [1, 1.5], cost: "80〜150万円", start: 0, len: 1.5, desc: "業務フロー・番号体系・帳票・権限の確定、移行対象データの棚卸し" },
  { name: "プロトタイプ（本デモの実データ検証）", months: [1.5, 2], cost: "150〜250万円", start: 1.5, len: 2, desc: "実際の過去案件データで、類似検索・BOM流用・帳票の有効性を検証" },
  { name: "本開発・テスト", months: [4, 6], cost: "900〜1,500万円", start: 3, len: 5, desc: "全機能の実装、Drive／SSO 連携、権限・監査ログ、受入テスト" },
  { name: "データ移行・教育・並行稼働", months: [1, 2], cost: "100〜250万円", start: 7.5, len: 2, desc: "Excel・既存システムからの移行、部門別研修、並行稼働と定着支援" },
];

const FAQ = [
  { q: "個別受注生産（ETO）に適した案件管理方法は？", a: "「案件」を中心に、受注前（引合・見積・審査）から受注後（工番・BOM・購買・製造）、納品後（装置・サービス）までを一本のライフサイクルとして管理する方法をおすすめします。ステージごとに「次のアクション」を明示し、担当が替わっても進め方が分かるようにします。" },
  { q: "顧客／拠点／案件／装置のデータ構造は？", a: "顧客 1：n 拠点、拠点 1：n 案件、案件 1：1 工番、工番 1：n 装置（号機）、装置 1：n サービス履歴 の階層を基本とします。装置は「どの拠点に設置されているか」と「どの工番で製造したか」の両方に紐付けるため、移設や複数台納入にも対応できます。" },
  { q: "取引番号 → 見積番号 → 工事番号の紐付けは？", a: "取引番号を親キーとし、見積番号は「取引番号＋版数」で採番するため、番号を見るだけで関係が分かります。工事番号は受注時に別系列で採番し、案件に 1：1 で紐付けます。製造番号は「工事番号＋号機」とし、納品後も工番から辿れるようにします。" },
  { q: "過去仕様／過去原価の検索・比較は？", a: "仕様を自由記述ではなく「処理能力・寸法・材質・制御・環境・オプション・個別項目」の構造化データで保存し、重み付きの類似度で検索します。見積原価と実績原価の差異も費目別に保存するため、次の見積精度が上がります。" },
  { q: "BOM 入力の負担を軽減する方法は？", a: "① 類似案件からユニット単位で流用、② 標準モジュール（制御盤・安全柵など）の展開、③ Excel／CAD 部品表の貼付取込、④ 品番入力による品目マスタ自動補完 の4つを組み合わせます。完成したユニットはテンプレート化でき、使うほど入力が楽になります。" },
  { q: "Google Drive とデータベースの役割分担は？", a: "検索・集計・紐付けが必要な情報（番号・仕様・原価・BOM・履歴）はデータベース、図面・議事録・写真などのファイルは Drive に保管します。システムは引合登録時に標準フォルダを自動作成し、ファイルIDで案件・装置と紐付けます。" },
  { q: "Google Workspace／AppSheet／GAS の活用可否は？", a: "SSO（ログイン）・Drive・Gmail 通知・カレンダーは積極的に活用します。AppSheet はスマホでの点検・サービス報告など現場入力に、GAS は定型レポートや通知の自動化に適しています。一方、BOM 階層や類似検索などの中核機能は Web アプリで実装する方が保守性・性能の面で有利です。" },
  { q: "既存ERPを使う領域と個別開発する領域の切り分けは？", a: "会計・給与・請求などの「どの会社でも同じ」領域は既存パッケージを継続利用し、案件・BOM・装置・サービスといった「御社の強み」となる領域を個別開発する切り分けをおすすめします（上記の表をご参照ください）。" },
  { q: "アクセス権限・情報セキュリティは？", a: "Google アカウントによるシングルサインオンと二段階認証を前提に、ロール（部署）× 承認段階（役職）で権限を制御します。原価・粗利は閲覧権限のないユーザーには画面・帳票・CSV のすべてでマスクし、全操作を監査ログに記録します。データは国内リージョンで暗号化保存し、日次バックアップを取得します。" },
  { q: "将来的な保守・運用・内製化は？", a: "設計書・データ定義・運用手順を整備したうえで引き渡し、マスタ追加・帳票変更・AppSheet 画面追加などは社内で対応できる体制を目指します。初年度は伴走型の保守契約で、問い合わせ対応・軽微な改修・社内担当者の育成を行います。" },
];

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }} className="scroll-mt-20">
      <div className="mb-3 flex items-end gap-3 border-b-2 border-ai-800 pb-2">
        <h2 className="font-mincho text-xl font-bold tracking-wider text-ai-900">{title}</h2>
      </div>
      {lead && <p className="mb-4 text-[0.8125rem] leading-relaxed text-stone-600">{lead}</p>}
      {children}
    </motion.section>
  );
}

export default function ProposalPage() {
  const [faq, setFaq] = useState<number | null>(0);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div>
      <PageHeader title="ご提案資料" description="基幹業務システム見直しに関する、要件整理・データ構造・システム構成・概算費用のご提案です" icon={<BookOpen size={20} />} breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "ご提案資料" }]} />
      <div className="grid gap-6 xl:grid-cols-[200px_1fr]">
        <nav className="hidden xl:block">
          <div className="sticky top-20 space-y-0.5">
            <div className="mb-2 text-[0.6875rem] font-bold tracking-widest text-stone-400">目次</div>
            {TOC.map((t) => (
              <button key={t.id} onClick={() => go(t.id)} className="block w-full rounded-md px-3 py-1.5 text-left text-[0.8125rem] text-stone-600 transition-colors hover:bg-surface hover:text-ai-800">
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="space-y-12">
          <section id="summary" className="scroll-mt-20">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-ai-800 to-ai-950 px-8 py-8 text-white">
                <div className="text-xs tracking-[0.3em] text-ai-300">PROPOSAL</div>
                <h2 className="font-mincho mt-2 text-2xl font-bold leading-relaxed tracking-wider">引合から納品・アフターサービスまで、<br className="hidden sm:block" />案件と装置を「一本の線」で管理する。</h2>
                <p className="mt-3 max-w-3xl text-[0.8125rem] leading-relaxed text-ai-100">
                  個別受注生産（ETO）では、同じ製品を繰り返し作る量産型と異なり、案件ごとの仕様・原価・BOM・納入実績こそが会社の財産です。本提案では、これらを案件単位で長期にわたり蓄積・再利用できる業務基盤を、既存の Google Workspace を活かしながら構築する方法をご提示します。
                </p>
              </div>
              <CardBody className="grid gap-4 sm:grid-cols-3">
                {[
                  ["二重入力をなくす", "一度入力した情報を見積書・仕様書・社内注文書・装置台帳へ自動転記"],
                  ["過去を資産に変える", "類似仕様・原価・BOM・故障実績を数秒で検索し、次の案件に流用"],
                  ["人に依存しない", "番号の紐付け・次のアクション・引継ぎメモで、誰でも案件を追える"],
                ].map(([t, d], i) => (
                  <div key={t} className="flex gap-3">
                    <span className="font-mincho flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-shu-500 text-base font-bold text-white">{["壱", "弐", "参"][i]}</span>
                    <div>
                      <div className="text-[0.875rem] font-bold">{t}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-stone-600">{d}</div>
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </section>

          <Section id="requirements" title="1. 要件整理" lead="ご相談内容をもとに、現状の課題と対応方針を整理しました。右列のリンクから、本デモで実際の動作をご確認いただけます。">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="w-8">No.</th>
                      <th>現状の課題</th>
                      <th>対応方針</th>
                      <th>デモで確認</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ISSUES.map((x, i) => (
                      <tr key={i}>
                        <td className="font-num text-center text-stone-400">{i + 1}</td>
                        <td className="min-w-[220px] font-medium text-stone-800">{x.issue}</td>
                        <td className="min-w-[320px] text-[0.8125rem] text-stone-700">{x.solution}</td>
                        <td>
                          <Link href={x.href} className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-ai-700 hover:underline">
                            {x.label}
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="mt-4">
              <CardBody>
                <div className="mb-3 text-[0.8125rem] font-bold">対象業務フロー（11ステージ）</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {["引合", "原価確認", "見積・仕様検討", "取引審査", "受注", "工番発行", "設計・BOM", "購買", "製造", "出荷・納品", "アフターサービス"].map((s, i, arr) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span className={cn("rounded-md px-2.5 py-1 text-xs font-medium", i < 4 ? "bg-ai-50 text-ai-800" : i < 9 ? "bg-shu-50 text-shu-700" : "bg-emerald-50 text-emerald-800")}>{s}</span>
                      {i < arr.length - 1 && <ArrowRight size={12} className="text-stone-300" />}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-[0.6875rem] text-stone-500">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-ai-200" />受注前（取引番号・見積番号）</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-shu-200" />受注後（工事番号）</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-200" />納品後（製造番号・サービス番号）</span>
                </div>
              </CardBody>
            </Card>
          </Section>

          <Section id="data" title="2. データ／マスタ構造のご提案" lead="案件を中心に、受注前・受注後・納品後の情報を番号で紐付けます。各ボックスの🔑は自動採番される番号です。">
            <Card>
              <CardBody>
                <ErDiagram />
              </CardBody>
            </Card>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardBody>
                  <div className="mb-2 text-[0.8125rem] font-bold">番号体系</div>
                  <div className="space-y-2 text-[0.8125rem]">
                    {[
                      ["取引番号", "T26-0042", "引合登録時"],
                      ["見積番号", "M26-0042-02", "取引番号＋版数"],
                      ["工事番号", "K26-118", "受注・工番発行時"],
                      ["製造番号", "K26-118-01", "工事番号＋号機"],
                      ["サービス受付番号", "S26-0087", "受付時"],
                    ].map(([a, b, c], i) => (
                      <div key={a} className="flex items-center gap-3">
                        <span className="w-28 text-xs text-stone-500">{a}</span>
                        <span className="font-num rounded-sm bg-stone-100 px-2 py-0.5 text-[0.8125rem] font-bold">{b}</span>
                        <span className="text-[0.6875rem] text-stone-500">{c}</span>
                        {i < 4 && <span className="ml-auto text-stone-300">↓</span>}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[0.6875rem] leading-relaxed text-stone-500">見積番号・製造番号は親番号を含むため、紙の帳票や図面に記載された番号からでも関係が分かります。全番号を画面上部の検索（Ctrl＋K）から横断検索できます。</p>
                </CardBody>
              </Card>
              <Card className="overflow-hidden">
                <div className="px-5 pt-4 text-[0.8125rem] font-bold">主要マスタ一覧</div>
                <div className="overflow-x-auto">
                  <table className="tbl tbl-compact mt-2">
                    <thead>
                      <tr>
                        <th>マスタ</th>
                        <th>主な項目</th>
                        <th>管理部門</th>
                        <th>更新頻度</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MASTERS.map(([a, b, c, d]) => (
                        <tr key={a}>
                          <td className="whitespace-nowrap text-[0.8125rem] font-medium">{a}</td>
                          <td className="text-xs text-stone-600">{b}</td>
                          <td className="whitespace-nowrap text-xs">{c}</td>
                          <td className="text-[0.6875rem] text-stone-500">{d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </Section>

          <Section id="system" title="3. システム構成のご提案" lead="3つの構成案を比較検討した結果、B案（Web アプリ＋クラウドDB＋Google Workspace 連携）を推奨いたします。">
            <div className="grid gap-3 lg:grid-cols-3">
              {OPTIONS.map((o) => (
                <Card key={o.key} className={cn("relative overflow-hidden", o.recommended && "border-2 border-shu-400 shadow-[var(--shadow-lift)]")}>
                  {o.recommended && <div className="absolute right-0 top-0 rounded-bl-lg bg-shu-500 px-3 py-1 text-[0.6875rem] font-bold text-white">推奨</div>}
                  <CardBody>
                    <div className="font-mincho text-2xl font-bold text-ai-800">{o.key}案</div>
                    <div className="mt-1 text-[0.8125rem] font-bold leading-snug">{o.title}</div>
                    <div className="mt-2 flex items-center gap-0.5">
                      <span className="mr-1 text-[0.6875rem] text-stone-500">ETO適合度</span>
                      {[1, 2, 3].map((n) => <Star key={n} size={13} className={n <= o.fit ? "fill-amber-400 text-amber-400" : "text-stone-300"} />)}
                    </div>
                    <ul className="mt-3 space-y-1 text-xs">
                      {o.pros.map((p) => <li key={p} className="flex gap-1.5"><Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />{p}</li>)}
                      {o.cons.map((p) => <li key={p} className="flex gap-1.5 text-stone-500"><Minus size={13} className="mt-0.5 shrink-0 text-rose-400" />{p}</li>)}
                    </ul>
                    <div className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-xs font-medium">{o.cost}</div>
                  </CardBody>
                </Card>
              ))}
            </div>
            <div className="mt-5">
              <div className="mb-2 text-[0.8125rem] font-bold">推奨構成（B案）</div>
              <ArchitectureDiagram />
            </div>
            <Card className="mt-5 overflow-hidden">
              <div className="px-5 pt-4 text-[0.8125rem] font-bold">既存ERP・パッケージを使う領域／個別開発する領域</div>
              <div className="overflow-x-auto">
                <table className="tbl mt-2">
                  <thead>
                    <tr>
                      <th>業務領域</th>
                      <th>推奨する実現方法</th>
                      <th>理由</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPLIT.map(([a, b, c, t]) => (
                      <tr key={a}>
                        <td className="font-medium">{a}</td>
                        <td>
                          <span className={cn("rounded-sm px-2 py-0.5 text-xs font-medium", t === "dev" ? "bg-shu-50 text-shu-700 ring-1 ring-shu-200" : t === "gws" ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-stone-100 text-stone-700 ring-1 ring-stone-300")}>{b}</span>
                        </td>
                        <td className="text-xs text-stone-600">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardBody>
                  <div className="mb-2 text-[0.8125rem] font-bold">アクセス権限・情報セキュリティ</div>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-stone-700">
                    {["Google アカウントによる SSO・二段階認証（パスワード管理を一元化）", "ロール（部署）×承認段階（役職）による操作制御", "原価・粗利は権限者のみ表示（画面・帳票・CSV すべて）", "Drive フォルダ権限をステージに応じて自動付与・社外共有を禁止", "全操作の監査ログ・国内リージョンでの暗号化保存・日次バックアップ", "退職・異動時は Workspace の組織変更に連動して権限を自動更新"].map((t) => <li key={t} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-ai-600" />{t}</li>)}
                  </ul>
                  <Link href="/settings" className="mt-3 inline-flex items-center gap-1 text-xs text-ai-700 hover:underline">権限マトリクスを見る<ArrowRight size={12} /></Link>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="mb-2 text-[0.8125rem] font-bold">保守・運用・内製化</div>
                  <ul className="space-y-1.5 text-xs leading-relaxed text-stone-700">
                    {["設計書・データ定義書・運用手順書を整備して引き渡し", "マスタ・帳票レイアウト・区分値は画面から社内で変更可能", "AppSheet／GAS による周辺機能は社内での追加を想定", "初年度は伴走型保守（問合せ・軽微改修・担当者育成）", "2年目以降は社内主体＋スポット支援への移行を計画"].map((t) => <li key={t} className="flex gap-2"><Check size={13} className="mt-0.5 shrink-0 text-ai-600" />{t}</li>)}
                  </ul>
                </CardBody>
              </Card>
            </div>
          </Section>

          <Section id="cost" title="4. 概算費用・開発期間（B案）" lead="要件確定前の参考概算です。対象範囲・移行データ量・連携先により変動します。要件定義完了時に確定見積をご提示いたします。">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>フェーズ</th>
                      <th>内容</th>
                      <th className="text-right">期間</th>
                      <th className="text-right">概算費用（税抜）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PHASES.map((p, i) => (
                      <tr key={p.name}>
                        <td className="whitespace-nowrap font-medium"><span className="font-num mr-2 text-stone-400">{i}</span>{p.name}</td>
                        <td className="text-xs text-stone-600">{p.desc}</td>
                        <td className="font-num whitespace-nowrap text-right text-xs">{p.months[0]}〜{p.months[1]}ヶ月</td>
                        <td className="font-num whitespace-nowrap text-right font-bold">{p.cost}</td>
                      </tr>
                    ))}
                    <tr className="bg-ai-50 font-bold">
                      <td colSpan={2}>合計（初期費用）</td>
                      <td className="font-num text-right">約8〜11ヶ月</td>
                      <td className="font-num text-right text-ai-900">1,230〜2,150万円</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="mt-4">
              <CardBody>
                <div className="mb-3 text-[0.8125rem] font-bold">スケジュール（イメージ）</div>
                <div className="scroll-thin overflow-x-auto">
                  <div className="min-w-[640px]">
                    <div className="ml-[200px] grid grid-cols-11 text-center text-[0.625rem] text-stone-500">
                      {Array.from({ length: 11 }).map((_, i) => <span key={i}>{i + 1}ヶ月目</span>)}
                    </div>
                    {PHASES.map((p, i) => (
                      <div key={p.name} className="mt-1.5 flex items-center">
                        <span className="w-[200px] shrink-0 pr-3 text-xs">{p.name}</span>
                        <div className="relative h-6 flex-1 rounded-sm bg-stone-100">
                          <motion.div
                            className={cn("absolute inset-y-0 rounded-sm", ["bg-ai-400", "bg-ai-600", "bg-shu-500", "bg-emerald-600"][i])}
                            style={{ left: `${(p.start / 11) * 100}%` }}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${(p.len / 11) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7, delay: i * 0.15 }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="ml-[200px] mt-2 flex text-[0.625rem] text-stone-500">
                      <span className="rounded-sm bg-shu-50 px-1.5 text-shu-700">◆ 5ヶ月目：主要機能の中間レビュー</span>
                      <span className="ml-auto rounded-sm bg-emerald-50 px-1.5 text-emerald-700">◆ 10ヶ月目：本稼働</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardBody>
                  <div className="mb-2 text-[0.8125rem] font-bold">ランニング費用（月額・目安）</div>
                  <table className="w-full text-xs">
                    <tbody>
                      {[
                        ["クラウド利用料（Cloud Run・Cloud SQL・バックアップ）", "3〜8万円"],
                        ["保守・運用サポート（伴走型）", "10〜25万円"],
                        ["Google Workspace", "既存契約内"],
                        ["AppSheet（現場入力を利用する場合）", "利用人数に応じて別途"],
                      ].map(([a, b]) => (
                        <tr key={a} className="border-b border-stone-100 last:border-0">
                          <td className="py-2 text-stone-600">{a}</td>
                          <td className="font-num py-2 text-right font-bold">{b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="mb-2 text-[0.8125rem] font-bold">費用を抑えるための段階導入案</div>
                  <ol className="space-y-1.5 text-xs leading-relaxed text-stone-700">
                    <li><b className="text-ai-800">第1期：</b>案件・番号管理・見積・類似検索・Drive 連携（営業中心）</li>
                    <li><b className="text-ai-800">第2期：</b>工番・BOM・購買・製造進捗（設計・製造中心）</li>
                    <li><b className="text-ai-800">第3期：</b>装置台帳・アフターサービス・AppSheet 現場入力</li>
                  </ol>
                  <p className="mt-2 text-[0.6875rem] text-stone-500">効果の大きい領域から段階的に稼働させ、投資を分散できます。各期の効果を確認しながら次期の範囲を調整します。</p>
                </CardBody>
              </Card>
            </div>
          </Section>

          <Section id="faq" title="5. ご相談ポイントへの回答">
            <div className="space-y-2">
              {FAQ.map((f, i) => (
                <Card key={i} className="overflow-hidden">
                  <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
                    <CircleHelp size={17} className="shrink-0 text-shu-500" />
                    <span className="flex-1 text-[0.875rem] font-bold text-stone-800">{f.q}</span>
                    <ChevronDown size={16} className={cn("text-stone-400 transition-transform", faq === i && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {faq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="border-t border-stone-100 px-5 py-4 pl-12 text-[0.8125rem] leading-[1.9] text-stone-700">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))}
            </div>
          </Section>

          <Section id="next" title="6. 今後の進め方">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["本デモのご確認", "実際に操作いただき、業務に合う点・合わない点をお聞かせください"],
                ["業務ヒアリング", "各部門（営業・設計・購買・製造・サービス）へ 1〜2時間ずつ"],
                ["過去データでの検証", "過去案件10〜20件分の実データで類似検索・BOM流用を検証"],
                ["確定見積・計画", "対象範囲・段階導入計画・体制を確定し、正式にご提案"],
              ].map(([t, d], i) => (
                <motion.div key={t} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card className="h-full">
                    <CardBody>
                      <div className="font-mincho text-3xl font-bold text-shu-500/80">{String(i + 1).padStart(2, "0")}</div>
                      <div className="mt-1 text-[0.875rem] font-bold">{t}</div>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">{d}</p>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
            <Card className="mt-4 bg-gradient-to-r from-ai-50 to-surface">
              <CardBody className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[0.8125rem] text-stone-700">まずはデモで、引合登録 → 見積承認 → 工番発行 → BOM流用 → 納品 → サービス受付 の一連の流れをお試しください。</div>
                <Link href="/cases/new" className="inline-flex items-center gap-1.5 rounded-md bg-shu-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-shu-600">
                  引合登録から試す
                  <ArrowRight size={15} />
                </Link>
              </CardBody>
            </Card>
          </Section>
        </div>
      </div>
    </div>
  );
}
