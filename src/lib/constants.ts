import type {
  Billing,
  CaseStatus,
  CostBreakdown,
  DocKind,
  EquipmentStatus,
  EquipmentType,
  FileType,
  Permission,
  POStatus,
  ProcessStatus,
  Procurement,
  QuoteStatus,
  Role,
  ServiceStatus,
  ServiceType,
  Stage,
} from "./types";

export const APP_NAME = "匠帳";
export const APP_SUBTITLE = "個別受注生産 案件・装置統合管理";

export interface StageDef {
  key: Stage;
  label: string;
  short: string;
  description: string;
  color: string; // バッジ用 Tailwind クラス
  dot: string;
}

export const STAGES: StageDef[] = [
  { key: "inquiry", label: "引合", short: "引合", description: "お客様からの引合を受け付け、要望を整理します", color: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  { key: "costing", label: "原価確認", short: "原価", description: "類似案件を参考に概算原価を確認します", color: "bg-cyan-50 text-cyan-700 ring-cyan-200", dot: "bg-cyan-500" },
  { key: "quotation", label: "見積・仕様検討", short: "見積", description: "仕様を詰め、見積書を作成・提出します", color: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
  { key: "review", label: "取引審査", short: "審査", description: "与信・採算・リスクを確認し、受注可否を判断します", color: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  { key: "ordered", label: "受注", short: "受注", description: "客先注文書を受領し、受注を登録します", color: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  { key: "workno", label: "工番発行", short: "工番", description: "工事番号を発行し、社内手配を開始します", color: "bg-orange-50 text-orange-700 ring-orange-200", dot: "bg-orange-500" },
  { key: "design", label: "設計・BOM", short: "設計", description: "詳細設計を行い、部品表（BOM）を作成します", color: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  { key: "procurement", label: "購買", short: "購買", description: "BOMを元に部品・材料を発注します", color: "bg-lime-50 text-lime-800 ring-lime-200", dot: "bg-lime-500" },
  { key: "manufacturing", label: "製造", short: "製造", description: "加工・組立・試運転・社内検査を行います", color: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  { key: "delivery", label: "出荷・納品", short: "出荷", description: "立会検査・出荷・据付・検収を行います", color: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500" },
  { key: "aftercare", label: "アフターサービス", short: "アフター", description: "納入装置の修理・改造・部品交換を管理します", color: "bg-stone-100 text-stone-700 ring-stone-300", dot: "bg-stone-500" },
];

export const STAGE_INDEX: Record<Stage, number> = STAGES.reduce(
  (acc, s, i) => ({ ...acc, [s.key]: i }),
  {} as Record<Stage, number>,
);

export const stageDef = (s: Stage) => STAGES[STAGE_INDEX[s]];

export const CASE_STATUS: Record<CaseStatus, { label: string; color: string }> = {
  active: { label: "進行中", color: "bg-ai-50 text-ai-700 ring-ai-200" },
  onhold: { label: "保留", color: "bg-amber-50 text-amber-800 ring-amber-200" },
  lost: { label: "失注", color: "bg-stone-100 text-stone-500 ring-stone-300" },
  completed: { label: "完了", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export interface EquipmentTypeDef {
  label: string;
  capacityUnit: string;
  icon: string;
}

export const EQUIPMENT_TYPES: Record<EquipmentType, EquipmentTypeDef> = {
  conveyor: { label: "搬送装置", capacityUnit: "個/分", icon: "conveyor" },
  washer: { label: "洗浄装置", capacityUnit: "個/時", icon: "washer" },
  dryer: { label: "乾燥炉", capacityUnit: "kg/時", icon: "dryer" },
  assembly: { label: "自動組立機", capacityUnit: "個/分", icon: "assembly" },
  inspection: { label: "検査装置", capacityUnit: "個/分", icon: "inspection" },
  mixer: { label: "混合攪拌装置", capacityUnit: "L/バッチ", icon: "mixer" },
  packaging: { label: "包装機", capacityUnit: "袋/分", icon: "packaging" },
  special: { label: "専用加工機", capacityUnit: "個/時", icon: "special" },
};

export const EQUIPMENT_TYPE_KEYS = Object.keys(EQUIPMENT_TYPES) as EquipmentType[];

export const MATERIALS = ["SUS304", "SUS316L", "SS400", "アルミ（A5052）", "樹脂（POM）", "SUS304＋SS400"];
export const CONTROLS = ["PLC（三菱 iQ-R）", "PLC（三菱 FX5U）", "PLC（オムロン NX）", "PLC（キーエンス KV-8000）", "リレー制御", "PC制御＋PLC"];
export const ENVIRONMENTS = ["一般屋内", "クリーンルーム（クラス10,000）", "防塵・防滴（IP65）", "高温多湿", "防爆エリア", "冷蔵環境（5℃）"];
export const POWERS = ["AC200V 3相 50Hz", "AC200V 3相 60Hz", "AC400V 3相 50Hz", "AC100V 単相", "AC200V 3相 50/60Hz"];
export const OPTION_PRESETS = [
  "安全柵・インターロック",
  "タッチパネル（日本語表示）",
  "稼働データ収集（IoT）",
  "遠隔監視",
  "CIP洗浄対応",
  "予備品一式",
  "据付・試運転",
  "取扱説明書（英語版）",
  "非常停止増設",
  "トレーサビリティ（QR読取）",
];
export const INQUIRY_CHANNELS = ["既存顧客（リピート）", "直接問合せ", "代理店経由", "展示会", "Webサイト", "紹介"];

export const COST_LABELS: Record<keyof CostBreakdown, string> = {
  design: "設計費",
  material: "材料費",
  purchased: "購入品費",
  machining: "加工費",
  assembly: "組立・配線費",
  testing: "試運転・検査費",
  transport: "輸送・据付費",
  overhead: "諸経費",
};
export const COST_KEYS = Object.keys(COST_LABELS) as (keyof CostBreakdown)[];
// 色覚多様性に配慮した検証済みの8色（固定順）
export const COST_COLORS: Record<keyof CostBreakdown, string> = {
  design: "#2a78d6",
  material: "#eb6834",
  purchased: "#1baf7a",
  machining: "#eda100",
  assembly: "#e87ba4",
  testing: "#008300",
  transport: "#6250d6",
  overhead: "#e34948",
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; color: string }> = {
  draft: { label: "作成中", color: "bg-stone-100 text-stone-600 ring-stone-300" },
  pending: { label: "承認待ち", color: "bg-amber-50 text-amber-800 ring-amber-200" },
  approved: { label: "承認済", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  submitted: { label: "提出済", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  accepted: { label: "受注", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  declined: { label: "不採用", color: "bg-stone-100 text-stone-500 ring-stone-300" },
};

export const PO_STATUS: Record<POStatus, { label: string; color: string }> = {
  requested: { label: "購買依頼", color: "bg-amber-50 text-amber-800 ring-amber-200" },
  ordered: { label: "発注済", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  partial: { label: "一部入荷", color: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  received: { label: "入荷済", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  cancelled: { label: "取消", color: "bg-stone-100 text-stone-500 ring-stone-300" },
};

export const PROCESS_STATUS: Record<ProcessStatus, { label: string; color: string; bar: string }> = {
  todo: { label: "未着手", color: "bg-stone-100 text-stone-600 ring-stone-300", bar: "bg-stone-300" },
  doing: { label: "進行中", color: "bg-sky-50 text-sky-700 ring-sky-200", bar: "bg-ai-500" },
  done: { label: "完了", color: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "bg-emerald-500" },
  delayed: { label: "遅延", color: "bg-rose-50 text-rose-700 ring-rose-200", bar: "bg-rose-500" },
};

export const PROCUREMENT: Record<Procurement, { label: string; color: string }> = {
  buy: { label: "購入", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  make: { label: "内製", color: "bg-amber-50 text-amber-800 ring-amber-200" },
  supplied: { label: "支給", color: "bg-stone-100 text-stone-600 ring-stone-300" },
};

export const EQUIPMENT_STATUS: Record<EquipmentStatus, { label: string; color: string; dot: string }> = {
  running: { label: "稼働中", color: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  repair: { label: "修理対応中", color: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  stopped: { label: "停止中", color: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  retired: { label: "廃棄・撤去", color: "bg-stone-100 text-stone-500 ring-stone-300", dot: "bg-stone-400" },
};

export const SERVICE_TYPES: Record<ServiceType, { label: string; color: string }> = {
  repair: { label: "修理", color: "bg-rose-50 text-rose-700 ring-rose-200" },
  modification: { label: "改造", color: "bg-violet-50 text-violet-700 ring-violet-200" },
  parts: { label: "部品交換", color: "bg-amber-50 text-amber-800 ring-amber-200" },
  inspection: { label: "定期点検", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  inquiry: { label: "問合せ", color: "bg-stone-100 text-stone-600 ring-stone-300" },
};

export const SERVICE_STATUS: Record<ServiceStatus, { label: string; color: string }> = {
  received: { label: "受付", color: "bg-sky-50 text-sky-700 ring-sky-200" },
  in_progress: { label: "対応中", color: "bg-amber-50 text-amber-800 ring-amber-200" },
  waiting_parts: { label: "部品手配中", color: "bg-violet-50 text-violet-700 ring-violet-200" },
  done: { label: "完了", color: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export const BILLING: Record<Billing, string> = {
  paid: "有償",
  free: "無償（サービス）",
  warranty: "保証内",
};

export const DOC_FOLDERS = [
  "01_引合・見積",
  "02_仕様・打合せ",
  "03_設計図面",
  "04_購買",
  "05_製造・検査",
  "06_出荷・納品",
  "07_アフターサービス",
];

export const DOC_KINDS: Record<DocKind, string> = {
  quote: "見積書",
  spec: "仕様書",
  drawing: "図面",
  minutes: "打合せ議事録",
  order: "注文書・指示書",
  inspection: "検査成績書",
  manual: "取扱説明書",
  photo: "写真",
  purchase: "購買資料",
  report: "報告書",
  other: "その他",
};

export const FILE_TYPES: Record<FileType, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "bg-rose-600" },
  xlsx: { label: "Excel", color: "bg-emerald-600" },
  docx: { label: "Word", color: "bg-sky-600" },
  dwg: { label: "CAD", color: "bg-violet-600" },
  jpg: { label: "画像", color: "bg-amber-500" },
  gdoc: { label: "Googleドキュメント", color: "bg-blue-500" },
  gsheet: { label: "Googleスプレッドシート", color: "bg-green-600" },
  zip: { label: "ZIP", color: "bg-stone-500" },
};

export const ROLES: Record<Role, { label: string; color: string }> = {
  admin: { label: "システム管理者", color: "bg-stone-800 text-white" },
  executive: { label: "経営・管理職", color: "bg-ai-800 text-white" },
  sales: { label: "営業", color: "bg-shu-500 text-white" },
  engineer: { label: "設計", color: "bg-indigo-600 text-white" },
  purchasing: { label: "購買", color: "bg-lime-700 text-white" },
  production: { label: "製造", color: "bg-emerald-700 text-white" },
  service: { label: "サービス", color: "bg-violet-700 text-white" },
};

export const PERMISSION_LABELS: Record<Permission, { label: string; description: string }> = {
  viewCost: { label: "原価・粗利の閲覧", description: "見積原価・実績原価・粗利率を表示します" },
  editCase: { label: "案件・見積の編集", description: "引合登録、仕様・見積の作成と更新" },
  approve: { label: "承認", description: "見積承認・取引審査の承認（役職に応じて段階が異なります）" },
  editBom: { label: "BOM編集", description: "部品表の作成・流用・取込" },
  purchase: { label: "購買発注", description: "購買依頼の発注・入荷登録" },
  editProduction: { label: "製造工程の更新", description: "工程の進捗・日程の更新" },
  editService: { label: "アフターサービス", description: "修理・改造・部品交換の受付と対応記録" },
  editMaster: { label: "マスタ・設定", description: "品目・仕入先・テンプレート・自社情報の管理" },
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["viewCost", "editCase", "approve", "editBom", "purchase", "editProduction", "editService", "editMaster"],
  executive: ["viewCost", "approve", "editCase"],
  sales: ["viewCost", "editCase", "approve"],
  engineer: ["viewCost", "editBom", "editProduction"],
  purchasing: ["viewCost", "purchase", "editBom"],
  production: ["editProduction"],
  service: ["editService"],
};

export const APPROVAL_LEVEL_LABEL = ["担当", "課長", "部長"] as const;

export const REVIEW_CHECK_ITEMS = [
  "与信限度額の範囲内である",
  "支払条件が社内基準を満たしている",
  "目標粗利率（25%以上）を確保している",
  "納期が生産能力上対応可能である",
  "技術的な実現性を設計部門が確認済",
  "契約条件（瑕疵担保・ペナルティ）を確認済",
];

export const DEFAULT_PROCESSES = [
  { name: "詳細設計", weight: 0.18 },
  { name: "部品手配", weight: 0.16 },
  { name: "機械加工", weight: 0.14 },
  { name: "板金・製缶", weight: 0.1 },
  { name: "組立", weight: 0.16 },
  { name: "電気配線", weight: 0.08 },
  { name: "試運転調整", weight: 0.1 },
  { name: "社内検査", weight: 0.05 },
  { name: "出荷準備", weight: 0.03 },
];

export const INDUSTRIES = ["自動車部品", "食品", "医薬品", "化学", "電子部品", "精密機器", "物流", "化粧品", "金属加工"];
