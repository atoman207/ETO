// ============================================================
// デモ用初期データ
// 日付はすべて「本日」からの相対日数で生成するため、いつ開いても自然な状態になります
// ============================================================
import type {
  Activity,
  ApprovalStep,
  AppNotification,
  BomItem,
  BomTemplate,
  BomTemplateItem,
  Case,
  CaseStatus,
  CompanySettings,
  CostBreakdown,
  Customer,
  DB,
  DealReview,
  DocFile,
  Equipment,
  EquipmentStatus,
  EquipmentType,
  Note,
  Part,
  ProcessStep,
  Procurement,
  PurchaseOrder,
  Quote,
  QuoteItem,
  QuoteStatus,
  ServiceRecord,
  ServiceStatus,
  ServiceType,
  Billing,
  Site,
  Spec,
  Stage,
  Supplier,
  User,
} from "./types";
import { addDays, diffDays, toDate, today, yy } from "./format";
import { DEFAULT_PROCESSES, EQUIPMENT_TYPES, REVIEW_CHECK_ITEMS, STAGE_INDEX } from "./constants";
import { instantiateTemplate } from "./bom";

export const SEED_VERSION = 4;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "株式会社サンプル製作所",
  postalCode: "444-0000",
  address: "愛知県岡崎市羽根町字サンプル1番地",
  phone: "0564-00-1234",
  fax: "0564-00-1235",
  representative: "代表取締役 杉山 修",
  invoiceNo: "T1234567890123",
  bankInfo: "三河中央銀行 本店営業部 普通 1234567",
  quoteValidDays: 60,
  taxRate: 0.1,
  warrantyMonths: 12,
};

const USERS: User[] = [
  { id: "u11", name: "吉田 恵", kana: "ヨシダ メグミ", dept: "管理部", title: "情報システム課長", role: "admin", approvalLevel: 2, email: "yoshida@sample-ss.co.jp", color: "#44403c" },
  { id: "u10", name: "加藤 正樹", kana: "カトウ マサキ", dept: "経営企画室", title: "取締役", role: "executive", approvalLevel: 2, email: "kato@sample-ss.co.jp", color: "#173a54" },
  { id: "u01", name: "佐藤 健一", kana: "サトウ ケンイチ", dept: "営業部", title: "部長", role: "sales", approvalLevel: 2, email: "sato@sample-ss.co.jp", color: "#c94f05" },
  { id: "u03", name: "高橋 誠", kana: "タカハシ マコト", dept: "営業部", title: "課長", role: "sales", approvalLevel: 1, email: "takahashi@sample-ss.co.jp", color: "#e07b39" },
  { id: "u02", name: "鈴木 美咲", kana: "スズキ ミサキ", dept: "営業部", title: "主任", role: "sales", approvalLevel: 0, email: "suzuki@sample-ss.co.jp", color: "#d9667a" },
  { id: "u12", name: "松本 亮", kana: "マツモト リョウ", dept: "営業部", title: "", role: "sales", approvalLevel: 0, email: "matsumoto@sample-ss.co.jp", color: "#b4762f" },
  { id: "u04", name: "田中 大輔", kana: "タナカ ダイスケ", dept: "設計部", title: "課長", role: "engineer", approvalLevel: 1, email: "tanaka@sample-ss.co.jp", color: "#4f46e5" },
  { id: "u05", name: "伊藤 彩", kana: "イトウ アヤ", dept: "設計部", title: "", role: "engineer", approvalLevel: 0, email: "ito@sample-ss.co.jp", color: "#7c6fd6" },
  { id: "u06", name: "渡辺 浩二", kana: "ワタナベ コウジ", dept: "購買部", title: "主任", role: "purchasing", approvalLevel: 0, email: "watanabe@sample-ss.co.jp", color: "#4d7c0f" },
  { id: "u07", name: "山本 拓也", kana: "ヤマモト タクヤ", dept: "製造部", title: "工場長", role: "production", approvalLevel: 1, email: "yamamoto@sample-ss.co.jp", color: "#047857" },
  { id: "u08", name: "中村 優子", kana: "ナカムラ ユウコ", dept: "サービス課", title: "課長", role: "service", approvalLevel: 1, email: "nakamura@sample-ss.co.jp", color: "#6d28d9" },
  { id: "u09", name: "小林 翔太", kana: "コバヤシ ショウタ", dept: "サービス課", title: "", role: "service", approvalLevel: 0, email: "kobayashi@sample-ss.co.jp", color: "#8b5cf6" },
];

const CUSTOMERS: Omit<Customer, "createdAt">[] = [
  { id: "cu01", code: "C-0001", name: "株式会社みなと精工", kana: "ミナトセイコウ", industry: "自動車部品", address: "神奈川県横浜市金沢区福浦2-5-1", phone: "045-000-1101", creditRank: "A", creditLimit: 80_000_000, paymentTerms: "月末締め 翌月末 現金払い", salesRepId: "u02", notes: "2019年からの取引。設備更新を計画的に実施する優良顧客。生産技術課がキーマン。" },
  { id: "cu02", code: "C-0002", name: "北陸ファインケミカル株式会社", kana: "ホクリクファインケミカル", industry: "化学", address: "富山県富山市草島1-23", phone: "076-000-2201", creditRank: "A", creditLimit: 120_000_000, paymentTerms: "月末締め 翌々月10日 手形（90日）", salesRepId: "u03", notes: "防爆エリア案件が多い。設計審査（DR）への参加を求められる。" },
  { id: "cu03", code: "C-0003", name: "やまと食品工業株式会社", kana: "ヤマトショクヒンコウギョウ", industry: "食品", address: "奈良県大和郡山市昭和工業団地3-8", phone: "0743-00-3301", creditRank: "B", creditLimit: 40_000_000, paymentTerms: "20日締め 翌月末 振込", salesRepId: "u12", notes: "HACCP対応必須。サニタリー仕様（分解洗浄性）を重視。" },
  { id: "cu04", code: "C-0004", name: "東海メディカル製薬株式会社", kana: "トウカイメディカルセイヤク", industry: "医薬品", address: "静岡県富士市今泉8-1", phone: "0545-00-4401", creditRank: "A", creditLimit: 100_000_000, paymentTerms: "月末締め 翌月末 振込", salesRepId: "u01", notes: "GMP対応のためバリデーション資料（IQ/OQ）の提出が必要。" },
  { id: "cu05", code: "C-0005", name: "株式会社シンワ電子", kana: "シンワデンシ", industry: "電子部品", address: "長野県諏訪市豊田2600", phone: "0266-00-5501", creditRank: "B", creditLimit: 50_000_000, paymentTerms: "月末締め 翌月末 振込", salesRepId: "u02", notes: "車載向け基板。トレーサビリティ要求が年々厳しくなっている。" },
  { id: "cu06", code: "C-0006", name: "瀬戸内ロジスティクス株式会社", kana: "セトウチロジスティクス", industry: "物流", address: "岡山県岡山市南区藤田566-12", phone: "086-000-6601", creditRank: "B", creditLimit: 60_000_000, paymentTerms: "月末締め 翌月末 振込", salesRepId: "u12", notes: "物流センターの自動化を段階的に推進中。短納期要望が多い。" },
  { id: "cu07", code: "C-0007", name: "株式会社さくら化粧品", kana: "サクラケショウヒン", industry: "化粧品", address: "埼玉県川越市芳野台2-8-30", phone: "049-000-7701", creditRank: "B", creditLimit: 30_000_000, paymentTerms: "月末締め 翌々月末 振込", salesRepId: "u03", notes: "容器形状の変更が多く、段取り替え時間の短縮が課題。" },
  { id: "cu08", code: "C-0008", name: "九州オートパーツ株式会社", kana: "キュウシュウオートパーツ", industry: "自動車部品", address: "福岡県京都郡苅田町新浜町1-6", phone: "093-000-8801", creditRank: "A", creditLimit: 150_000_000, paymentTerms: "月末締め 翌月末 現金払い", salesRepId: "u01", notes: "EV関連部品の増産投資が活発。複数ライン同時立上げの可能性あり。" },
  { id: "cu09", code: "C-0009", name: "株式会社アルプス精密", kana: "アルプスセイミツ", industry: "精密機器", address: "山梨県甲府市国母6-2-1", phone: "055-000-9901", creditRank: "C", creditLimit: 20_000_000, paymentTerms: "月末締め 翌々月末 手形（120日）", salesRepId: "u03", notes: "与信ランクC。前受金または分割請求を条件とすること。" },
  { id: "cu10", code: "C-0010", name: "みちのく乳業株式会社", kana: "ミチノクニュウギョウ", industry: "食品", address: "岩手県花巻市二枚橋第5地割", phone: "0198-00-1001", creditRank: "B", creditLimit: 45_000_000, paymentTerms: "月末締め 翌月末 振込", salesRepId: "u02", notes: "冷蔵環境下での稼働が前提。結露対策の実績を評価いただいている。" },
];

const SITES: Site[] = [
  { id: "si01a", customerId: "cu01", name: "本社工場", address: "神奈川県横浜市金沢区福浦2-5-1", phone: "045-000-1102", contacts: [
    { id: "ct01", name: "田村 浩之", dept: "生産技術課", title: "課長", email: "tamura@minato-seiko.example.jp", phone: "045-000-1110" },
    { id: "ct02", name: "森 綾香", dept: "購買課", title: "", email: "mori@minato-seiko.example.jp", phone: "045-000-1120" },
  ] },
  { id: "si01b", customerId: "cu01", name: "綾瀬第二工場", address: "神奈川県綾瀬市小園771", phone: "0467-00-1103", contacts: [
    { id: "ct03", name: "石井 達也", dept: "製造部 保全課", title: "係長", email: "ishii@minato-seiko.example.jp", phone: "0467-00-1130" },
  ] },
  { id: "si02a", customerId: "cu02", name: "富山工場", address: "富山県富山市草島1-23", phone: "076-000-2202", contacts: [
    { id: "ct04", name: "林 秀樹", dept: "設備技術部", title: "部長", email: "hayashi@hokuriku-fc.example.jp", phone: "076-000-2210" },
  ] },
  { id: "si02b", customerId: "cu02", name: "高岡事業所", address: "富山県高岡市長慶寺1000", phone: "0766-00-2203", contacts: [
    { id: "ct05", name: "清水 由美", dept: "生産管理課", title: "主任", email: "shimizu@hokuriku-fc.example.jp", phone: "0766-00-2220" },
  ] },
  { id: "si03a", customerId: "cu03", name: "奈良工場", address: "奈良県大和郡山市昭和工業団地3-8", phone: "0743-00-3302", contacts: [
    { id: "ct06", name: "山口 剛", dept: "工務課", title: "課長", email: "yamaguchi@yamato-foods.example.jp", phone: "0743-00-3310" },
  ] },
  { id: "si03b", customerId: "cu03", name: "三重伊賀工場（新設）", address: "三重県伊賀市ゆめが丘7-1", phone: "0595-00-3303", contacts: [
    { id: "ct07", name: "岡田 美穂", dept: "新工場建設プロジェクト", title: "リーダー", email: "okada@yamato-foods.example.jp", phone: "0595-00-3320" },
  ] },
  { id: "si04a", customerId: "cu04", name: "富士工場", address: "静岡県富士市今泉8-1", phone: "0545-00-4402", contacts: [
    { id: "ct08", name: "藤田 誠一", dept: "製造技術部", title: "課長", email: "fujita@tokai-medical.example.jp", phone: "0545-00-4410" },
    { id: "ct09", name: "後藤 麻衣", dept: "品質保証部", title: "", email: "goto@tokai-medical.example.jp", phone: "0545-00-4420" },
  ] },
  { id: "si05a", customerId: "cu05", name: "諏訪工場", address: "長野県諏訪市豊田2600", phone: "0266-00-5502", contacts: [
    { id: "ct10", name: "長谷川 修", dept: "生産技術グループ", title: "マネージャー", email: "hasegawa@shinwa-denshi.example.jp", phone: "0266-00-5510" },
  ] },
  { id: "si05b", customerId: "cu05", name: "松本工場", address: "長野県松本市和田4010", phone: "0263-00-5503", contacts: [
    { id: "ct11", name: "村上 健太", dept: "製造課", title: "係長", email: "murakami@shinwa-denshi.example.jp", phone: "0263-00-5520" },
  ] },
  { id: "si06a", customerId: "cu06", name: "岡山物流センター", address: "岡山県岡山市南区藤田566-12", phone: "086-000-6602", contacts: [
    { id: "ct12", name: "近藤 大樹", dept: "センター運営部", title: "センター長", email: "kondo@setouchi-logi.example.jp", phone: "086-000-6610" },
  ] },
  { id: "si06b", customerId: "cu06", name: "広島ディストリビューションセンター", address: "広島県広島市西区商工センター7-5", phone: "082-000-6603", contacts: [
    { id: "ct13", name: "坂本 真一", dept: "設備企画課", title: "課長", email: "sakamoto@setouchi-logi.example.jp", phone: "082-000-6620" },
  ] },
  { id: "si07a", customerId: "cu07", name: "川越工場", address: "埼玉県川越市芳野台2-8-30", phone: "049-000-7702", contacts: [
    { id: "ct14", name: "遠藤 理恵", dept: "生産部 技術課", title: "課長代理", email: "endo@sakura-cosme.example.jp", phone: "049-000-7710" },
  ] },
  { id: "si08a", customerId: "cu08", name: "苅田工場", address: "福岡県京都郡苅田町新浜町1-6", phone: "093-000-8802", contacts: [
    { id: "ct15", name: "青木 隆", dept: "生産技術部", title: "部長", email: "aoki@kyushu-ap.example.jp", phone: "093-000-8810" },
    { id: "ct16", name: "福田 沙織", dept: "調達部", title: "", email: "fukuda@kyushu-ap.example.jp", phone: "093-000-8820" },
  ] },
  { id: "si09a", customerId: "cu09", name: "甲府工場", address: "山梨県甲府市国母6-2-1", phone: "055-000-9902", contacts: [
    { id: "ct17", name: "西村 和也", dept: "技術部", title: "課長", email: "nishimura@alps-seimitsu.example.jp", phone: "055-000-9910" },
  ] },
  { id: "si10a", customerId: "cu10", name: "花巻工場", address: "岩手県花巻市二枚橋第5地割", phone: "0198-00-1002", contacts: [
    { id: "ct18", name: "佐々木 隆之", dept: "工務部", title: "課長", email: "sasaki@michinoku-milk.example.jp", phone: "0198-00-1010" },
  ] },
];

const SUPPLIERS: Supplier[] = [
  { id: "sp01", code: "V-101", name: "株式会社関東ベアリング商会", category: "機械要素部品", phone: "03-0000-0101", address: "東京都大田区東糀谷3-1", contact: "営業部 大野様", rating: 4 },
  { id: "sp02", code: "V-102", name: "三和電機販売株式会社", category: "電気・制御機器", phone: "052-000-0102", address: "愛知県名古屋市中区栄1-2", contact: "FA営業課 川口様", rating: 5 },
  { id: "sp03", code: "V-103", name: "有限会社丸山製作所", category: "機械加工（外注）", phone: "0564-00-0103", address: "愛知県岡崎市大平町5-6", contact: "丸山社長", rating: 4 },
  { id: "sp04", code: "V-104", name: "株式会社東洋板金", category: "板金・製缶（外注）", phone: "0566-00-0104", address: "愛知県安城市篠目町2-3", contact: "工務 野村様", rating: 3 },
  { id: "sp05", code: "V-105", name: "株式会社エヌケー商事", category: "FA部品商社", phone: "06-0000-0105", address: "大阪府大阪市西区靱本町1-9", contact: "名古屋営業所 内田様", rating: 4 },
  { id: "sp06", code: "V-106", name: "大和鋼材株式会社", category: "鋼材", phone: "0533-00-0106", address: "愛知県豊川市穂ノ原2-11", contact: "販売課 原様", rating: 4 },
  { id: "sp07", code: "V-107", name: "株式会社ステンレス中央", category: "ステンレス材", phone: "052-000-0107", address: "愛知県名古屋市港区船見町3", contact: "営業 菅原様", rating: 3 },
  { id: "sp08", code: "V-108", name: "アサヒ空圧株式会社", category: "空圧機器", phone: "052-000-0108", address: "愛知県名古屋市熱田区神宮4-7", contact: "営業 久保様", rating: 5 },
  { id: "sp09", code: "V-109", name: "日本モーター販売株式会社", category: "モーター・減速機", phone: "03-0000-0109", address: "東京都品川区南大井6-20", contact: "中部支店 千葉様", rating: 4 },
  { id: "sp10", code: "V-110", name: "株式会社北村塗装", category: "塗装・表面処理（外注）", phone: "0564-00-0110", address: "愛知県岡崎市上地4-25", contact: "北村専務", rating: 4 },
];

type PartRow = [string, string, string, string, string, string, number, string, number, Procurement];
// [品番, 品名, 型式・仕様, 分類, メーカー, 単位, 標準単価, 仕入先, LT(日), 手配区分]
const PART_ROWS: PartRow[] = [
  ["E-1001", "PLC CPUユニット", "R04CPU", "電気・制御", "三菱電機", "台", 185000, "sp02", 14, "buy"],
  ["E-1002", "入力ユニット", "RX40C7 DC24V 16点", "電気・制御", "三菱電機", "台", 28000, "sp02", 7, "buy"],
  ["E-1003", "出力ユニット", "RY40NT5P トランジスタ 16点", "電気・制御", "三菱電機", "台", 28000, "sp02", 7, "buy"],
  ["E-1004", "タッチパネル 10.4インチ", "GT2510-VTBA", "電気・制御", "三菱電機", "台", 168000, "sp02", 21, "buy"],
  ["E-1005", "インバータ 2.2kW", "FR-E820-2.2K", "電気・制御", "三菱電機", "台", 52000, "sp02", 10, "buy"],
  ["E-1006", "ACサーボモーター 400W", "HK-KT43W", "駆動", "三菱電機", "台", 78000, "sp02", 28, "buy"],
  ["E-1007", "サーボアンプ 400W", "MR-J5-40G", "駆動", "三菱電機", "台", 92000, "sp02", 28, "buy"],
  ["E-1008", "制御盤筐体 W800", "BCV-80-120 自立型", "電気・制御", "日東工業", "面", 145000, "sp02", 21, "buy"],
  ["E-1009", "配線用遮断器 3P 30A", "NF32-SV", "電気・制御", "三菱電機", "個", 6800, "sp02", 5, "buy"],
  ["E-1010", "電磁接触器", "S-T21 AC200V", "電気・制御", "三菱電機", "個", 4200, "sp02", 5, "buy"],
  ["E-1011", "パワーリレー", "G2R-1-S DC24V", "電気・制御", "オムロン", "個", 980, "sp02", 3, "buy"],
  ["E-1012", "端子台", "BTBH15C 15A", "電気・制御", "IDEC", "個", 450, "sp02", 3, "buy"],
  ["E-1013", "積層信号灯 3段", "LR6-302WJBW-RYG", "電気・制御", "パトライト", "個", 18500, "sp02", 7, "buy"],
  ["E-1014", "非常停止スイッチ", "XA1E-BV3U02R φ40", "安全", "IDEC", "個", 3200, "sp02", 5, "buy"],
  ["S-2001", "光電センサ", "PZ-G51N", "センサ", "キーエンス", "個", 12800, "sp05", 3, "buy"],
  ["S-2002", "近接センサ", "E2E-X5ME1 M18", "センサ", "オムロン", "個", 4600, "sp05", 3, "buy"],
  ["S-2003", "画像判別センサ", "IV4-G500CA", "センサ", "キーエンス", "式", 298000, "sp05", 14, "buy"],
  ["S-2004", "ロードセル 2t", "CMM1-2T", "センサ", "ミネベアミツミ", "個", 86000, "sp05", 30, "buy"],
  ["S-2005", "温度調節器", "E5CC-QX2ASM-800", "センサ", "オムロン", "個", 14500, "sp02", 5, "buy"],
  ["S-2006", "熱電対 Kタイプ", "シース φ6.4 L300", "センサ", "チノー", "本", 5800, "sp05", 10, "buy"],
  ["S-2007", "セーフティライトカーテン", "GL-R 40光軸", "安全", "キーエンス", "組", 185000, "sp05", 14, "buy"],
  ["M-3001", "LMガイド", "HSR25A2SS+800L", "機械要素", "THK", "本", 38000, "sp01", 21, "buy"],
  ["M-3002", "ボールねじ", "BNK2020-3.6 L600", "機械要素", "THK", "本", 64000, "sp01", 28, "buy"],
  ["M-3003", "ピロー形ユニット", "UCP205", "機械要素", "NTN", "個", 3400, "sp01", 5, "buy"],
  ["M-3004", "深溝玉軸受", "6205ZZ", "機械要素", "日本精工", "個", 680, "sp01", 3, "buy"],
  ["M-3005", "カップリング", "SFC-040DA2", "機械要素", "鍋屋バイテック", "個", 12600, "sp01", 7, "buy"],
  ["M-3006", "ローラチェーン", "RS60-1", "機械要素", "椿本チエイン", "m", 3800, "sp01", 7, "buy"],
  ["M-3007", "スプロケット", "RS60-18T", "機械要素", "椿本チエイン", "個", 4500, "sp01", 7, "buy"],
  ["M-3008", "樹脂モジュラーベルト", "W600 ピッチ25.4", "機械要素", "ニッタ", "m", 28000, "sp05", 21, "buy"],
  ["M-3009", "SUSローラー", "φ48.6 L600", "機械要素", "伊東電機", "本", 6200, "sp05", 14, "buy"],
  ["M-3010", "レベリングアジャスタ", "M16 自在型", "機械要素", "イマオコーポレーション", "個", 1800, "sp05", 3, "buy"],
  ["D-4001", "ギヤードモーター 0.4kW", "GM-SSY 1/30", "駆動", "三菱電機", "台", 68000, "sp09", 21, "buy"],
  ["D-4002", "ギヤードモーター 1.5kW", "CNHM1-6100 1/29", "駆動", "住友重機械工業", "台", 168000, "sp09", 35, "buy"],
  ["D-4003", "ステッピングモーター", "AZM66AC", "駆動", "オリエンタルモーター", "台", 54000, "sp09", 14, "buy"],
  ["D-4004", "攪拌用減速機 7.5kW", "パラマックス 1/10", "駆動", "住友重機械工業", "台", 520000, "sp09", 60, "buy"],
  ["P-5001", "エアシリンダ φ32", "CDQ2B32-50DZ", "空圧", "SMC", "個", 9800, "sp08", 5, "buy"],
  ["P-5002", "5ポート電磁弁", "SY5120-5DZ", "空圧", "SMC", "個", 7600, "sp08", 5, "buy"],
  ["P-5003", "フィルタレギュレータ", "AW30-03BG", "空圧", "SMC", "個", 8900, "sp08", 5, "buy"],
  ["P-5004", "真空エジェクタ", "ZK2A12K5NL", "空圧", "SMC", "個", 24000, "sp08", 10, "buy"],
  ["P-5005", "真空パッド", "ZP3-16US", "空圧", "SMC", "個", 1200, "sp08", 5, "buy"],
  ["R-6001", "SUS304 板 t3", "4×8（1219×2438）HL", "材料", "—", "枚", 68000, "sp07", 7, "buy"],
  ["R-6002", "SS400 角パイプ", "□50×50×t2.3 定尺5.5m", "材料", "—", "本", 6400, "sp06", 5, "buy"],
  ["R-6003", "SUS304 角パイプ", "□40×40×t2.0 定尺4m", "材料", "—", "本", 14800, "sp07", 7, "buy"],
  ["R-6004", "アルミフレーム", "HFS8-4040 L1000", "材料", "—", "本", 2600, "sp05", 5, "buy"],
  ["R-6005", "SUS316L 板 t4", "4×8（1219×2438）2B", "材料", "—", "枚", 142000, "sp07", 14, "buy"],
  ["A-7001", "安全柵パネル", "H1800×W1000 メッシュ", "安全", "—", "枚", 32000, "sp05", 14, "buy"],
  ["A-7002", "セーフティドアスイッチ", "D4NS-4CF", "安全", "オムロン", "個", 8800, "sp02", 7, "buy"],
  ["F-8001", "本体フレーム（製缶品）", "図面指示", "外注加工", "東洋板金", "式", 680000, "sp04", 30, "buy"],
  ["F-8002", "機械加工部品一式", "図面指示", "外注加工", "丸山製作所", "式", 420000, "sp03", 25, "buy"],
  ["F-8003", "洗浄槽（SUS316L溶接構造）", "図面指示 3槽式", "外注加工", "東洋板金", "式", 1450000, "sp04", 40, "buy"],
  ["F-8004", "電気ヒーター 12kW", "シーズヒーター AC200V", "熱機器", "八光電機", "台", 320000, "sp05", 30, "buy"],
  ["F-8005", "攪拌槽 500L ジャケット付", "図面指示 第一種圧力容器", "外注加工", "東洋板金", "台", 3800000, "sp04", 75, "buy"],
  ["F-8006", "焼付塗装", "メラミン焼付 マンセル5Y7/1", "外注加工", "北村塗装", "式", 85000, "sp10", 10, "buy"],
  ["F-8007", "シロッコファン 2.2kW", "SF-2.2 耐熱仕様", "熱機器", "昭和電機", "台", 145000, "sp09", 30, "buy"],
  ["F-8008", "高圧洗浄ポンプ", "縦型多段 3.7kW", "流体機器", "荏原製作所", "台", 380000, "sp05", 35, "buy"],
  ["F-8009", "ノズル・配管一式", "SUS304 サニタリー配管", "流体機器", "—", "式", 540000, "sp04", 30, "buy"],
  ["F-8010", "断熱パネル", "グラスウール t100 SUS外装", "熱機器", "—", "式", 860000, "sp04", 30, "buy"],
  ["F-8011", "インパルスヒートシーラー", "W400 上下加熱", "包装機器", "富士インパルス", "台", 520000, "sp05", 45, "buy"],
  ["F-8012", "フィルム供給装置", "ダンサー式 張力制御", "包装機器", "—", "台", 780000, "sp05", 45, "buy"],
  ["F-8013", "垂直多関節ロボット 7kg", "RV-7FRL", "駆動", "三菱電機", "台", 2450000, "sp02", 60, "buy"],
  ["F-8014", "ロボットハンド", "自社設計 2爪＋吸着", "加工品", "自社", "式", 280000, "", 20, "make"],
  ["F-8015", "検査用LED照明", "リング照明 φ100 白色", "センサ", "シーシーエス", "個", 68000, "sp05", 21, "buy"],
  ["F-8016", "ブラケット・カバー類", "自社板金 SPCC t1.6", "加工品", "自社", "式", 160000, "", 10, "make"],
];

interface ModuleDef {
  id: string;
  name: string;
  type?: EquipmentType;
  desc: string;
  children: [string, number][];
}

const MODULES: ModuleDef[] = [
  { id: "tp_ctrl", name: "制御盤ユニット（三菱PLC標準）", desc: "PLC・タッチパネル・主回路一式。ほぼ全機種で共通利用している標準構成。", children: [["E-1008", 1], ["E-1001", 1], ["E-1002", 2], ["E-1003", 2], ["E-1004", 1], ["E-1009", 3], ["E-1010", 4], ["E-1011", 16], ["E-1012", 40], ["E-1013", 1], ["E-1014", 2]] },
  { id: "tp_safe", name: "安全柵ユニット（標準4面）", desc: "メッシュ安全柵＋ドアインターロック＋ライトカーテン。", children: [["A-7001", 8], ["A-7002", 2], ["S-2007", 1]] },
  { id: "tp_conv", name: "ベルトコンベヤユニット（L3000）", type: "conveyor", desc: "SUSフレーム・樹脂モジュラーベルトの標準コンベヤ。長さ3m基準。", children: [["R-6003", 6], ["M-3008", 6], ["D-4001", 1], ["M-3003", 4], ["M-3006", 3], ["M-3007", 2], ["M-3009", 10], ["S-2001", 4], ["M-3010", 6]] },
  { id: "tp_air", name: "空圧ユニット", desc: "FRL・電磁弁マニホールド・シリンダの標準セット。", children: [["P-5003", 1], ["P-5002", 6], ["P-5001", 6]] },
  { id: "tp_pick", name: "ピック＆プレースユニット（2軸サーボ）", type: "assembly", desc: "LMガイド＋ボールねじの直交2軸。真空吸着ハンド付。", children: [["M-3001", 2], ["M-3002", 1], ["E-1006", 2], ["E-1007", 2], ["M-3005", 2], ["P-5004", 2], ["P-5005", 4]] },
  { id: "tp_frame", name: "本体フレームユニット", desc: "製缶フレーム＋外装板＋アジャスタ。", children: [["F-8001", 1], ["R-6001", 2], ["M-3010", 6], ["F-8016", 1]] },
  { id: "tp_wash", name: "洗浄ユニット（3槽式）", type: "washer", desc: "洗浄・すすぎ・エアブローの3槽式。高圧ポンプ・ヒーター含む。", children: [["F-8003", 1], ["F-8008", 1], ["F-8009", 1], ["F-8004", 1], ["S-2005", 2], ["S-2006", 2]] },
  { id: "tp_dry", name: "乾燥炉本体ユニット", type: "dryer", desc: "断熱パネル構造の熱風循環式乾燥炉。", children: [["F-8010", 1], ["F-8004", 2], ["F-8007", 2], ["S-2005", 3], ["S-2006", 4]] },
  { id: "tp_mix", name: "攪拌槽ユニット（500L）", type: "mixer", desc: "ジャケット付攪拌槽・減速機・ロードセル計量。", children: [["F-8005", 1], ["D-4004", 1], ["S-2004", 3], ["F-8009", 1]] },
  { id: "tp_vis", name: "画像検査ユニット", type: "inspection", desc: "画像判別センサ2台＋照明＋トリガセンサ。", children: [["S-2003", 2], ["F-8015", 2], ["S-2001", 2]] },
  { id: "tp_robot", name: "ロボットセルユニット", type: "assembly", desc: "6軸ロボット＋自社製ハンド。", children: [["F-8013", 1], ["F-8014", 1], ["A-7002", 1]] },
  { id: "tp_pack", name: "包装ユニット", type: "packaging", desc: "フィルム供給・ヒートシール・送り機構。", children: [["F-8011", 1], ["F-8012", 1], ["D-4003", 2], ["E-1006", 1], ["E-1007", 1], ["S-2001", 3]] },
  { id: "tp_mach", name: "機械加工部品", desc: "図面指示による機械加工部品一式（外注）。", children: [["F-8002", 1]] },
];

const TYPE_MODULES: Record<EquipmentType, string[]> = {
  conveyor: ["tp_frame", "tp_conv", "tp_conv", "tp_air", "tp_ctrl", "tp_safe", "tp_mach"],
  washer: ["tp_frame", "tp_wash", "tp_conv", "tp_ctrl", "tp_mach"],
  dryer: ["tp_dry", "tp_conv", "tp_ctrl", "tp_mach"],
  assembly: ["tp_frame", "tp_pick", "tp_pick", "tp_robot", "tp_air", "tp_ctrl", "tp_safe", "tp_mach"],
  inspection: ["tp_frame", "tp_conv", "tp_vis", "tp_air", "tp_ctrl", "tp_mach"],
  mixer: ["tp_frame", "tp_mix", "tp_ctrl", "tp_mach"],
  packaging: ["tp_frame", "tp_pack", "tp_conv", "tp_ctrl", "tp_safe", "tp_mach"],
  special: ["tp_frame", "tp_pick", "tp_air", "tp_ctrl", "tp_safe", "tp_mach"],
};

const COST_RATIO: Record<EquipmentType, CostBreakdown> = {
  conveyor: { design: 0.1, material: 0.18, purchased: 0.3, machining: 0.1, assembly: 0.14, testing: 0.05, transport: 0.06, overhead: 0.07 },
  washer: { design: 0.11, material: 0.2, purchased: 0.3, machining: 0.08, assembly: 0.14, testing: 0.06, transport: 0.04, overhead: 0.07 },
  dryer: { design: 0.1, material: 0.22, purchased: 0.28, machining: 0.07, assembly: 0.15, testing: 0.07, transport: 0.04, overhead: 0.07 },
  assembly: { design: 0.16, material: 0.08, purchased: 0.38, machining: 0.1, assembly: 0.12, testing: 0.07, transport: 0.02, overhead: 0.07 },
  inspection: { design: 0.17, material: 0.07, purchased: 0.4, machining: 0.08, assembly: 0.1, testing: 0.08, transport: 0.03, overhead: 0.07 },
  mixer: { design: 0.1, material: 0.24, purchased: 0.3, machining: 0.07, assembly: 0.13, testing: 0.06, transport: 0.03, overhead: 0.07 },
  packaging: { design: 0.13, material: 0.1, purchased: 0.37, machining: 0.1, assembly: 0.13, testing: 0.07, transport: 0.03, overhead: 0.07 },
  special: { design: 0.15, material: 0.12, purchased: 0.3, machining: 0.15, assembly: 0.12, testing: 0.06, transport: 0.03, overhead: 0.07 },
};

const DEFAULT_SPEC: Spec = {
  capacity: 0,
  capacityUnit: "",
  width: 0,
  depth: 0,
  height: 0,
  power: "AC200V 3相 60Hz",
  material: "SUS304",
  control: "PLC（三菱 iQ-R）",
  environment: "一般屋内",
  workpiece: "",
  options: [],
  notes: "",
  customFields: [],
};

interface CaseDef {
  key: string;
  title: string;
  cust: string;
  site: string;
  type: EquipmentType;
  stage: Stage;
  status?: CaseStatus;
  sales: string;
  eng?: string;
  inquiry?: number;
  order?: number;
  lead?: number;
  amount: number;
  margin: number;
  prob?: "A" | "B" | "C";
  channel: string;
  desc: string;
  spec: Partial<Spec>;
  qty?: number;
  tags?: string[];
  lostReason?: string;
  quoteStates?: QuoteStatus[];
  reviewApprovals?: ("approved" | "waiting")[];
  notes?: [string, string, boolean?, number?][];
  sourceEq?: string;
  sourceSvc?: string;
  refs?: string[];
  modules?: string[];
  delayed?: boolean;
  overrun?: Partial<Record<keyof CostBreakdown, number>>;
  eqStatus?: EquipmentStatus;
  location?: string;
  discount?: number;
}

const CASES: CaseDef[] = [
  // ───────────── 納入済み（アフターサービス） ─────────────
  {
    key: "P1", title: "ブラケット搬送ライン", cust: "cu01", site: "si01a", type: "conveyor", stage: "aftercare", status: "completed",
    sales: "u02", eng: "u05", order: -1060, lead: 160, amount: 18_500_000, margin: 0.27, channel: "既存顧客（リピート）",
    desc: "プレス工程から溶接工程へのブラケット搬送を自動化したい。既存の手押し台車からの置き換え。",
    spec: { capacity: 45, width: 6000, depth: 900, height: 950, material: "SS400", control: "PLC（三菱 FX5U）", environment: "一般屋内", workpiece: "自動車用ブラケット（最大5kg）", options: ["安全柵・インターロック", "タッチパネル（日本語表示）"], customFields: [{ label: "搬送方式", value: "チェーンコンベヤ（パレット式）" }, { label: "搬送物重量", value: "最大5kg/個" }] },
    tags: ["自動車", "チェーン搬送"], location: "本社工場 第1プレス棟",
    notes: [["u05", "搬送チェーンは給油管理が前提。客先保全担当へ週1回の給油を依頼済み。", true]],
  },
  {
    key: "P2", title: "部品洗浄装置（3槽式）", cust: "cu01", site: "si01b", type: "washer", stage: "aftercare", status: "completed",
    sales: "u02", eng: "u04", order: -800, lead: 180, amount: 32_000_000, margin: 0.29, channel: "既存顧客（リピート）",
    desc: "ミッションケース加工後の切粉・油分除去。清浄度要求 ISO 16232 準拠（残渣 5mg 以下）。",
    spec: { capacity: 600, width: 4500, depth: 1800, height: 2000, material: "SUS304", control: "PLC（三菱 iQ-R）", environment: "防塵・防滴（IP65）", workpiece: "ミッションケース（アルミダイカスト）", options: ["タッチパネル（日本語表示）", "稼働データ収集（IoT）"], customFields: [{ label: "洗浄液", value: "アルカリ洗浄液（60℃）" }, { label: "槽構成", value: "洗浄・すすぎ・エアブローの3槽" }, { label: "清浄度", value: "残渣 5mg/個 以下" }] },
    tags: ["自動車", "洗浄", "清浄度管理"], location: "綾瀬第二工場 加工棟2F", eqStatus: "repair",
    notes: [["u04", "洗浄槽ヒーターは12kW×1。2号機検討時はヒーター容量の見直しが必要（立上げ時間の改善要望あり）。", true]],
  },
  {
    key: "P3", title: "惣菜トレー搬送コンベヤ", cust: "cu03", site: "si03a", type: "conveyor", stage: "aftercare", status: "completed",
    sales: "u12", eng: "u05", order: -660, lead: 150, amount: 12_800_000, margin: 0.25, channel: "直接問合せ", qty: 2,
    desc: "盛付ラインのトレー搬送。分解洗浄が容易なサニタリー構造を希望。2ライン分。",
    spec: { capacity: 80, width: 8000, depth: 600, height: 850, material: "SUS304", control: "PLC（三菱 FX5U）", environment: "高温多湿", workpiece: "惣菜トレー（PP製 250×180）", options: ["予備品一式", "タッチパネル（日本語表示）"], customFields: [{ label: "搬送方式", value: "樹脂モジュラーベルト" }, { label: "洗浄性", value: "工具レス分解" }] },
    tags: ["食品", "サニタリー", "HACCP"], location: "奈良工場 盛付室",
  },
  {
    key: "P4", title: "500L反応攪拌装置", cust: "cu02", site: "si02a", type: "mixer", stage: "aftercare", status: "completed",
    sales: "u03", eng: "u04", order: -930, lead: 230, amount: 46_000_000, margin: 0.28, channel: "既存顧客（リピート）",
    desc: "樹脂原料の反応・攪拌工程。防爆エリア設置、温度制御精度 ±1℃。",
    spec: { capacity: 500, width: 2400, depth: 2400, height: 4200, material: "SUS316L", control: "PLC（オムロン NX）", environment: "防爆エリア", workpiece: "樹脂原料（粘度 5,000mPa·s）", options: ["遠隔監視", "予備品一式"], customFields: [{ label: "設計圧力", value: "FV〜0.2MPa" }, { label: "ジャケット", value: "温水・冷水切替" }, { label: "防爆構造", value: "耐圧防爆 d2G4" }] },
    tags: ["化学", "防爆", "圧力容器"], location: "富山工場 第3反応棟",
  },
  {
    key: "P5", title: "基板外観検査装置", cust: "cu05", site: "si05a", type: "inspection", stage: "aftercare", status: "completed",
    sales: "u02", eng: "u05", order: -560, lead: 160, amount: 24_000_000, margin: 0.31, channel: "展示会",
    desc: "車載用プリント基板の実装後外観検査。目視検査員2名の省人化。",
    spec: { capacity: 30, width: 1800, depth: 1200, height: 1800, material: "アルミ（A5052）", control: "PLC（キーエンス KV-8000）", environment: "クリーンルーム（クラス10,000）", workpiece: "車載用プリント基板（250×200）", options: ["トレーサビリティ（QR読取）", "稼働データ収集（IoT）"], customFields: [{ label: "検査項目", value: "部品欠品・ずれ・はんだブリッジ" }, { label: "検出精度", value: "0.1mm" }] },
    tags: ["電子部品", "画像検査", "トレーサビリティ"], location: "諏訪工場 SMTライン3",
  },
  {
    key: "P6", title: "バイアル包装機", cust: "cu04", site: "si04a", type: "packaging", stage: "aftercare", status: "completed",
    sales: "u01", eng: "u04", order: -480, lead: 180, amount: 38_000_000, margin: 0.3, channel: "代理店経由",
    desc: "注射剤バイアルのピロー包装。GMP対応、IQ/OQ文書一式の提出。",
    spec: { capacity: 60, width: 3500, depth: 1500, height: 1900, material: "SUS304", control: "PLC（三菱 iQ-R）", environment: "クリーンルーム（クラス10,000）", workpiece: "バイアル瓶（10mL）", options: ["トレーサビリティ（QR読取）", "安全柵・インターロック"], customFields: [{ label: "包材", value: "PET/AL/PE 3層フィルム" }, { label: "バリデーション", value: "IQ/OQ 文書提出" }] },
    tags: ["医薬品", "GMP", "包装"], location: "富士工場 注射剤棟",
  },
  {
    key: "P7", title: "ハウジング自動組立機", cust: "cu08", site: "si08a", type: "assembly", stage: "aftercare", status: "completed",
    sales: "u01", eng: "u04", order: -470, lead: 220, amount: 52_000_000, margin: 0.26, channel: "既存顧客（リピート）",
    desc: "電動パワステ用ハウジングへのベアリング圧入・シール組付けの自動化。",
    spec: { capacity: 12, width: 4000, depth: 3000, height: 2200, material: "SS400", control: "PLC（三菱 iQ-R）", environment: "一般屋内", workpiece: "電動パワステ用ハウジング", options: ["安全柵・インターロック", "タッチパネル（日本語表示）", "稼働データ収集（IoT）"], customFields: [{ label: "タクトタイム", value: "5秒/個" }, { label: "圧入荷重", value: "最大 20kN（荷重監視付）" }] },
    tags: ["自動車", "EV", "ロボット"], location: "苅田工場 第2組立ライン",
    overrun: { assembly: 0.28, testing: 0.35 },
    notes: [["u04", "圧入ユニットの調整に想定以上の工数（+120h）。次回は圧入治具を事前に試作検証すること。", true]],
  },
  {
    key: "P8", title: "ボトル乾燥装置", cust: "cu10", site: "si10a", type: "dryer", stage: "aftercare", status: "completed",
    sales: "u02", eng: "u05", order: -330, lead: 150, amount: 21_000_000, margin: 0.27, channel: "Webサイト",
    desc: "洗瓶後の水滴除去・乾燥。冷蔵エリア隣接のため結露対策が必要。",
    spec: { capacity: 300, width: 6000, depth: 1500, height: 2000, material: "SUS304", control: "PLC（三菱 FX5U）", environment: "冷蔵環境（5℃）", workpiece: "乳飲料ボトル（500mL）", options: ["タッチパネル（日本語表示）"], customFields: [{ label: "乾燥温度", value: "最高 90℃" }, { label: "結露対策", value: "外装二重断熱＋ヒーター" }] },
    tags: ["食品", "乾燥", "結露対策"], location: "花巻工場 充填室前室",
  },
  {
    key: "P9", title: "専用穴あけ加工機", cust: "cu09", site: "si09a", type: "special", stage: "aftercare", status: "completed",
    sales: "u03", eng: "u04", order: -720, lead: 170, amount: 28_000_000, margin: 0.24, channel: "紹介",
    desc: "精密ブロックへの多軸同時穴あけ。段取り替え10分以内。",
    spec: { capacity: 40, width: 2200, depth: 1800, height: 2100, material: "SS400", control: "PLC（オムロン NX）", environment: "一般屋内", workpiece: "精密ブロック（S50C）", options: ["安全柵・インターロック"], customFields: [{ label: "加工内容", value: "φ6.8 ドリル×8 同時加工" }, { label: "段取り替え", value: "10分以内" }] },
    tags: ["専用機", "多軸加工"], location: "甲府工場 機械加工課",
  },
  {
    key: "P10", title: "ケース仕分けコンベヤ", cust: "cu06", site: "si06a", type: "conveyor", stage: "aftercare", status: "completed",
    sales: "u12", eng: "u05", order: -260, lead: 150, amount: 22_000_000, margin: 0.26, channel: "直接問合せ",
    desc: "出荷ケースの方面別仕分け（12方面）。バーコード読取による自動振分け。",
    spec: { capacity: 120, width: 12000, depth: 1000, height: 800, material: "SS400", control: "PLC（三菱 FX5U）", environment: "一般屋内", workpiece: "段ボールケース（最大30kg）", options: ["トレーサビリティ（QR読取）", "稼働データ収集（IoT）"], customFields: [{ label: "仕分け方面", value: "12方面" }, { label: "搬送方式", value: "ローラーコンベヤ＋ダイバーター" }] },
    tags: ["物流", "仕分け"], location: "岡山物流センター 出荷エリア", eqStatus: "repair",
  },
  {
    key: "P11", title: "化粧品容器洗浄装置", cust: "cu07", site: "si07a", type: "washer", stage: "aftercare", status: "completed",
    sales: "u03", eng: "u05", order: -1000, lead: 150, amount: 19_500_000, margin: 0.28, channel: "直接問合せ",
    desc: "充填前の容器内面洗浄（純水リンス）。容器形状6種類に対応。",
    spec: { capacity: 1200, width: 3800, depth: 1400, height: 1900, material: "SUS304", control: "PLC（三菱 FX5U）", environment: "クリーンルーム（クラス10,000）", workpiece: "化粧品ボトル（30〜200mL）", options: ["タッチパネル（日本語表示）"], customFields: [{ label: "洗浄液", value: "純水（常温）" }, { label: "対応容器", value: "6種類（段取り替え式）" }] },
    tags: ["化粧品", "洗浄"], location: "川越工場 充填室",
  },
  // ───────────── 進行中 ─────────────
  {
    key: "A1", title: "部品洗浄装置 増設（2号機）", cust: "cu01", site: "si01b", type: "washer", stage: "inquiry",
    sales: "u02", inquiry: -3, amount: 34_000_000, margin: 0.28, prob: "A", channel: "既存顧客（リピート）",
    desc: "既設1号機と同等仕様で2号機を増設したい。処理能力は1.2倍（720個/時）を希望。設置スペースは1号機の隣（W5000以内）。",
    spec: { capacity: 720, width: 4800, depth: 1800, height: 2000, material: "SUS304", control: "PLC（三菱 iQ-R）", environment: "防塵・防滴（IP65）", workpiece: "ミッションケース（アルミダイカスト）", options: ["タッチパネル（日本語表示）", "稼働データ収集（IoT）"], customFields: [{ label: "洗浄液", value: "アルカリ洗浄液（60℃）" }, { label: "槽構成", value: "洗浄・すすぎ・エアブローの3槽" }] },
    tags: ["自動車", "洗浄", "リピート"], refs: ["P2"],
    notes: [["u02", "石井係長より：1号機の立上げ時間（約40分）を短縮したいとのこと。ヒーター容量アップを提案予定。", true, -2]],
  },
  {
    key: "A2", title: "化粧品容器 外観検査装置", cust: "cu07", site: "si07a", type: "inspection", stage: "inquiry",
    sales: "u03", inquiry: -6, amount: 21_000_000, margin: 0.3, prob: "B", channel: "既存顧客（リピート）",
    desc: "充填後容器のキャップ浮き・ラベルずれ・異物の全数検査を自動化したい。",
    spec: { capacity: 40, width: 2000, depth: 1200, height: 1800, material: "SUS304", control: "PLC（キーエンス KV-8000）", environment: "クリーンルーム（クラス10,000）", workpiece: "化粧品ボトル（30〜200mL）", options: ["トレーサビリティ（QR読取）"], customFields: [{ label: "検査項目", value: "キャップ浮き・ラベルずれ・異物" }] },
    tags: ["化粧品", "画像検査"], refs: ["P5"],
  },
  {
    key: "A3", title: "ケース搬送・仕分けライン", cust: "cu06", site: "si06b", type: "conveyor", stage: "inquiry",
    sales: "u12", inquiry: -1, amount: 28_000_000, margin: 0.26, prob: "B", channel: "既存顧客（リピート）",
    desc: "岡山センターでの実績を評価いただき、広島DCにも16方面の仕分けラインを導入したいとの引合。",
    spec: { capacity: 150, width: 15000, depth: 1000, height: 800, material: "SS400", control: "PLC（三菱 FX5U）", environment: "一般屋内", workpiece: "段ボールケース（最大30kg）", options: ["トレーサビリティ（QR読取）", "稼働データ収集（IoT）"], customFields: [{ label: "仕分け方面", value: "16方面" }] },
    tags: ["物流", "仕分け", "横展開"], refs: ["P10"],
  },
  {
    key: "A4", title: "惣菜トレー搬送コンベヤ（新工場向け）", cust: "cu03", site: "si03b", type: "conveyor", stage: "costing",
    sales: "u12", eng: "u05", inquiry: -18, amount: 15_500_000, margin: 0.26, prob: "A", channel: "既存顧客（リピート）",
    desc: "三重新工場の盛付ライン向け。奈良工場納入機と同仕様で3ライン。ベルト蛇行対策を織り込みたい。",
    spec: { capacity: 90, width: 9000, depth: 600, height: 850, material: "SUS304", control: "PLC（三菱 FX5U）", environment: "高温多湿", workpiece: "惣菜トレー（PP製 250×180）", options: ["予備品一式", "タッチパネル（日本語表示）", "CIP洗浄対応"], customFields: [{ label: "搬送方式", value: "樹脂モジュラーベルト" }, { label: "ライン数", value: "3ライン" }] },
    tags: ["食品", "サニタリー", "新工場"], refs: ["P3"],
  },
  {
    key: "A5", title: "アンプル外観検査装置", cust: "cu04", site: "si04a", type: "inspection", stage: "costing",
    sales: "u01", eng: "u05", inquiry: -22, amount: 26_000_000, margin: 0.3, prob: "B", channel: "既存顧客（リピート）",
    desc: "アンプルの異物・クラック検査。現行の目視検査（4名×2直）を自動化。",
    spec: { capacity: 50, width: 2400, depth: 1500, height: 1900, material: "SUS304", control: "PLC（三菱 iQ-R）", environment: "クリーンルーム（クラス10,000）", workpiece: "アンプル（2mL）", options: ["トレーサビリティ（QR読取）", "安全柵・インターロック"], customFields: [{ label: "検査項目", value: "浮遊異物・クラック・液量" }, { label: "バリデーション", value: "IQ/OQ/PQ 文書提出" }] },
    tags: ["医薬品", "GMP", "画像検査"], refs: ["P5", "P6"],
  },
  {
    key: "A6", title: "1000L攪拌装置", cust: "cu02", site: "si02b", type: "mixer", stage: "quotation",
    sales: "u03", eng: "u04", inquiry: -40, amount: 68_000_000, margin: 0.27, prob: "B", channel: "既存顧客（リピート）",
    desc: "富山工場納入の500L機をベースに容量を倍増。設置場所は高岡事業所（非防爆エリア）。",
    spec: { capacity: 1000, width: 3000, depth: 3000, height: 5200, material: "SUS316L", control: "PLC（オムロン NX）", environment: "一般屋内", workpiece: "樹脂原料（粘度 8,000mPa·s）", options: ["遠隔監視", "予備品一式", "据付・試運転"], customFields: [{ label: "設計圧力", value: "FV〜0.2MPa" }, { label: "ジャケット", value: "温水・冷水切替" }] },
    tags: ["化学", "圧力容器", "大型"], refs: ["P4"], quoteStates: ["submitted", "draft"],
    notes: [["u03", "Rev.1 提出後、林部長より「予算 6,500万円以内」との回答。Rev.2 で減速機仕様を見直し中。", true, -12]],
  },
  {
    key: "A7", title: "ヨーグルトカップ包装機", cust: "cu10", site: "si10a", type: "packaging", stage: "quotation",
    sales: "u02", eng: "u04", inquiry: -35, amount: 42_000_000, margin: 0.29, prob: "A", channel: "既存顧客（リピート）",
    desc: "カップ容器のフィルム蓋シール・外装包装。冷蔵環境（5℃）での安定稼働が条件。",
    spec: { capacity: 80, width: 4200, depth: 1600, height: 1900, material: "SUS304", control: "PLC（三菱 iQ-R）", environment: "冷蔵環境（5℃）", workpiece: "ヨーグルトカップ（100g）", options: ["安全柵・インターロック", "タッチパネル（日本語表示）", "稼働データ収集（IoT）"], customFields: [{ label: "包材", value: "PET/AL/PE 3層フィルム" }, { label: "結露対策", value: "盤内ヒーター＋除湿" }] },
    tags: ["食品", "包装", "冷蔵"], refs: ["P6", "P8"], quoteStates: ["pending"],
  },
  {
    key: "A8", title: "精密部品 自動組立機", cust: "cu09", site: "si09a", type: "assembly", stage: "quotation",
    sales: "u03", eng: "u04", inquiry: -28, amount: 48_000_000, margin: 0.27, prob: "C", channel: "既存顧客（リピート）",
    desc: "精密ブロックへのピン圧入・ねじ締めの自動化。与信ランクCのため支払条件の調整が必要。",
    spec: { capacity: 10, width: 3500, depth: 2500, height: 2100, material: "SS400", control: "PLC（オムロン NX）", environment: "一般屋内", workpiece: "精密ブロック（S50C）", options: ["安全柵・インターロック", "トレーサビリティ（QR読取）"], customFields: [{ label: "タクトタイム", value: "6秒/個" }] },
    tags: ["精密機器", "ロボット", "与信注意"], refs: ["P7", "P9"], quoteStates: ["draft"],
  },
  {
    key: "A9", title: "ハウジング自動組立機（2号ライン）", cust: "cu08", site: "si08a", type: "assembly", stage: "review",
    sales: "u01", eng: "u04", inquiry: -58, amount: 55_000_000, margin: 0.27, prob: "A", channel: "既存顧客（リピート）",
    desc: "EV向け増産に伴う2号ライン。1号機の改善点（圧入ユニット）を反映した仕様。",
    spec: { capacity: 14, width: 4200, depth: 3000, height: 2200, material: "SS400", control: "PLC（三菱 iQ-R）", environment: "一般屋内", workpiece: "電動パワステ用ハウジング", options: ["安全柵・インターロック", "タッチパネル（日本語表示）", "稼働データ収集（IoT）"], customFields: [{ label: "タクトタイム", value: "4.3秒/個" }, { label: "圧入荷重", value: "最大 20kN（荷重監視付）" }] },
    tags: ["自動車", "EV", "ロボット", "リピート"], refs: ["P7"], quoteStates: ["submitted", "submitted"], reviewApprovals: ["approved", "approved", "waiting"],
    discount: 500_000,
    notes: [["u01", "1号機で圧入調整に工数超過した経緯あり。今回は試作検証費を見積に計上済み。", true, -9], ["u04", "圧入治具は先行して試作し、客先ワークで検証する計画（2週間）。", false, -6]],
  },
  {
    key: "A10", title: "基板搬送コンベヤ", cust: "cu05", site: "si05b", type: "conveyor", stage: "review",
    sales: "u02", eng: "u05", inquiry: -50, amount: 9_800_000, margin: 0.25, prob: "A", channel: "既存顧客（リピート）",
    desc: "松本工場SMTライン間の基板搬送。ESD対策ベルト。",
    spec: { capacity: 30, width: 5000, depth: 500, height: 900, material: "アルミ（A5052）", control: "PLC（キーエンス KV-8000）", environment: "クリーンルーム（クラス10,000）", workpiece: "プリント基板（250×200）", options: ["トレーサビリティ（QR読取）"], customFields: [{ label: "ESD対策", value: "導電性ベルト（10^6Ω）" }] },
    tags: ["電子部品", "搬送"], refs: ["P5"], quoteStates: ["submitted"], reviewApprovals: ["approved", "waiting", "waiting"],
  },
  {
    key: "A11", title: "ブラケット搬送ライン 更新", cust: "cu01", site: "si01a", type: "conveyor", stage: "ordered",
    sales: "u02", eng: "u05", order: -3, lead: 150, amount: 21_500_000, margin: 0.27, channel: "既存顧客（リピート）",
    desc: "既設ライン（2023年度納入）の能力増強更新。チェーン方式から樹脂ベルト方式へ変更し、保全負荷を軽減。",
    spec: { capacity: 60, width: 6500, depth: 900, height: 950, material: "SUS304＋SS400", control: "PLC（三菱 iQ-R）", environment: "一般屋内", workpiece: "自動車用ブラケット（最大5kg）", options: ["安全柵・インターロック", "タッチパネル（日本語表示）", "稼働データ収集（IoT）"], customFields: [{ label: "搬送方式", value: "樹脂モジュラーベルト" }, { label: "搬送物重量", value: "最大5kg/個" }] },
    tags: ["自動車", "更新", "リピート"], refs: ["P1"], sourceEq: "P1", sourceSvc: "S3",
    notes: [["u02", "田村課長より：既設機の撤去は客先手配。据付は年末年始の長期休暇中（12/28〜1/5）を希望。", true, -2]],
  },
  {
    key: "A12", title: "基板外観検査装置（2号機）", cust: "cu05", site: "si05a", type: "inspection", stage: "design",
    sales: "u02", eng: "u05", order: -24, lead: 150, amount: 25_500_000, margin: 0.31, channel: "既存顧客（リピート）",
    desc: "1号機と同等仕様。検査項目に「部品極性」を追加。",
    spec: { capacity: 35, width: 1800, depth: 1200, height: 1800, material: "アルミ（A5052）", control: "PLC（キーエンス KV-8000）", environment: "クリーンルーム（クラス10,000）", workpiece: "車載用プリント基板（250×200）", options: ["トレーサビリティ（QR読取）", "稼働データ収集（IoT）"], customFields: [{ label: "検査項目", value: "部品欠品・ずれ・はんだブリッジ・極性" }, { label: "検出精度", value: "0.1mm" }] },
    tags: ["電子部品", "画像検査", "リピート"], refs: ["P5"],
  },
  {
    key: "A13", title: "容器洗浄装置 乾燥ゾーン追加改造", cust: "cu07", site: "si07a", type: "washer", stage: "design",
    sales: "u03", eng: "u05", order: -14, lead: 80, amount: 6_800_000, margin: 0.3, channel: "既存顧客（リピート）",
    desc: "既設洗浄装置の出口側に温風乾燥ゾーン（L1500）を追加。アフターサービス窓口からの相談案件。",
    spec: { capacity: 1200, width: 1500, depth: 1400, height: 1900, material: "SUS304", control: "PLC（三菱 FX5U）", environment: "クリーンルーム（クラス10,000）", workpiece: "化粧品ボトル（30〜200mL）", options: ["据付・試運転"], customFields: [{ label: "改造内容", value: "温風乾燥ゾーン追加（L1500）" }, { label: "停止可能期間", value: "5日間（GW休暇中）" }] },
    tags: ["化粧品", "改造", "アフター起点"], refs: ["P11"], sourceEq: "P11", sourceSvc: "S12",
    modules: ["tp_dry", "tp_mach"],
  },
  {
    key: "A14", title: "バイアル搬送コンベヤ", cust: "cu04", site: "si04a", type: "conveyor", stage: "procurement",
    sales: "u01", eng: "u05", order: -52, lead: 140, amount: 16_800_000, margin: 0.28, channel: "既存顧客（リピート）",
    desc: "包装機（2024年度納入）前工程へのバイアル供給コンベヤ。",
    spec: { capacity: 60, width: 7000, depth: 500, height: 900, material: "SUS304", control: "PLC（三菱 iQ-R）", environment: "クリーンルーム（クラス10,000）", workpiece: "バイアル瓶（10mL）", options: ["トレーサビリティ（QR読取）"], customFields: [{ label: "搬送方式", value: "テーブルトップチェーン（SUS）" }] },
    tags: ["医薬品", "GMP", "搬送"], refs: ["P6"],
  },
  {
    key: "A15", title: "自動梱包ライン", cust: "cu06", site: "si06a", type: "packaging", stage: "procurement",
    sales: "u12", eng: "u04", order: -60, lead: 160, amount: 36_000_000, margin: 0.27, channel: "既存顧客（リピート）",
    desc: "仕分けコンベヤ下流の自動梱包・封函。",
    spec: { capacity: 25, width: 6000, depth: 2500, height: 2100, material: "SS400", control: "PLC（三菱 iQ-R）", environment: "一般屋内", workpiece: "段ボールケース（最大30kg）", options: ["安全柵・インターロック", "稼働データ収集（IoT）"], customFields: [{ label: "封函方式", value: "OPPテープ上下貼り" }] },
    tags: ["物流", "包装"], refs: ["P10"],
  },
  {
    key: "A16", title: "500L攪拌装置 2号機", cust: "cu02", site: "si02a", type: "mixer", stage: "manufacturing",
    sales: "u03", eng: "u04", order: -125, lead: 175, amount: 47_500_000, margin: 0.28, channel: "既存顧客（リピート）",
    desc: "1号機と同仕様。制御盤のみ最新機種へ更新。",
    spec: { capacity: 500, width: 2400, depth: 2400, height: 4200, material: "SUS316L", control: "PLC（オムロン NX）", environment: "防爆エリア", workpiece: "樹脂原料（粘度 5,000mPa·s）", options: ["遠隔監視", "予備品一式"], customFields: [{ label: "設計圧力", value: "FV〜0.2MPa" }, { label: "防爆構造", value: "耐圧防爆 d2G4" }] },
    tags: ["化学", "防爆", "リピート"], refs: ["P4"], delayed: true,
    notes: [["u07", "攪拌槽（東洋板金）の納入が1週間遅延。組立日程を後ろ倒しで調整中。出荷日への影響なし。", true, -3]],
  },
  {
    key: "A17", title: "連続式乾燥炉", cust: "cu03", site: "si03a", type: "dryer", stage: "manufacturing",
    sales: "u12", eng: "u05", order: -112, lead: 150, amount: 23_000_000, margin: 0.27, channel: "既存顧客（リピート）",
    desc: "洗浄後トレーの乾燥。既設トレー搬送コンベヤとの接続。",
    spec: { capacity: 350, width: 7000, depth: 1500, height: 2000, material: "SUS304", control: "PLC（三菱 FX5U）", environment: "高温多湿", workpiece: "惣菜トレー（PP製 250×180）", options: ["タッチパネル（日本語表示）"], customFields: [{ label: "乾燥温度", value: "最高 80℃" }] },
    tags: ["食品", "乾燥"], refs: ["P8"],
  },
  {
    key: "A18", title: "ハウジング洗浄装置", cust: "cu08", site: "si08a", type: "washer", stage: "delivery",
    sales: "u01", eng: "u04", order: -152, lead: 162, amount: 29_000_000, margin: 0.28, channel: "既存顧客（リピート）",
    desc: "組立前ハウジングの洗浄。2号ライン立上げに先行して導入。",
    spec: { capacity: 500, width: 4200, depth: 1800, height: 2000, material: "SUS304", control: "PLC（三菱 iQ-R）", environment: "防塵・防滴（IP65）", workpiece: "電動パワステ用ハウジング", options: ["タッチパネル（日本語表示）", "稼働データ収集（IoT）"], customFields: [{ label: "洗浄液", value: "アルカリ洗浄液（60℃）" }, { label: "槽構成", value: "洗浄・すすぎ・エアブローの3槽" }] },
    tags: ["自動車", "洗浄"], refs: ["P2"],
  },
  {
    key: "A19", title: "専用タップ加工機", cust: "cu09", site: "si09a", type: "special", stage: "quotation", status: "onhold",
    sales: "u03", eng: "u04", inquiry: -95, amount: 24_000_000, margin: 0.25, prob: "C", channel: "既存顧客（リピート）",
    desc: "精密ブロックへのM6タップ加工。客先の設備投資計画見直しにより保留中。",
    spec: { capacity: 30, width: 2000, depth: 1800, height: 2100, material: "SS400", control: "PLC（オムロン NX）", environment: "一般屋内", workpiece: "精密ブロック（S50C）", options: ["安全柵・インターロック"], customFields: [{ label: "加工内容", value: "M6タップ×8箇所" }] },
    tags: ["専用機", "保留"], refs: ["P9"], quoteStates: ["submitted"],
    notes: [["u03", "西村課長より：来期（4月）予算で再検討。2月に再度ご提案予定。", true, -20]],
  },
  {
    key: "A20", title: "牛乳パック搬送コンベヤ", cust: "cu10", site: "si10a", type: "conveyor", stage: "quotation", status: "lost",
    sales: "u02", eng: "u05", inquiry: -150, amount: 11_000_000, margin: 0.25, prob: "B", channel: "既存顧客（リピート）",
    desc: "充填機後の牛乳パック搬送。",
    spec: { capacity: 120, width: 10000, depth: 400, height: 900, material: "SUS304", control: "PLC（三菱 FX5U）", environment: "冷蔵環境（5℃）", workpiece: "牛乳パック（1000mL）", options: [], customFields: [] },
    tags: ["食品", "失注"], quoteStates: ["declined"], lostReason: "価格差により失注（競合比 約12%高）。次回は標準ユニット活用で原価低減を図る。",
  },
  {
    key: "A21", title: "クリーム充填機", cust: "cu07", site: "si07a", type: "packaging", stage: "review", status: "lost",
    sales: "u03", eng: "u04", inquiry: -130, amount: 33_000_000, margin: 0.27, prob: "B", channel: "既存顧客（リピート）",
    desc: "クリーム容器への定量充填。",
    spec: { capacity: 40, width: 3000, depth: 1500, height: 2000, material: "SUS316L", control: "PLC（三菱 iQ-R）", environment: "クリーンルーム（クラス10,000）", workpiece: "クリーム容器（50g）", options: ["CIP洗浄対応"], customFields: [] },
    tags: ["化粧品", "失注"], quoteStates: ["declined"], reviewApprovals: ["approved", "waiting", "waiting"], lostReason: "客先都合（新製品の発売計画中止）",
  },
];

interface SvcDef {
  key: string;
  eq: string; // 案件キー + 号機
  type: ServiceType;
  title: string;
  desc: string;
  cause: string;
  action: string;
  reported: number;
  done?: number;
  due?: number;
  status: ServiceStatus;
  assignee: string;
  billing: Billing;
  parts: [string, number][];
  hours: number;
  amount: number;
  reporter: string;
  linked?: string;
}

const SERVICES: SvcDef[] = [
  { key: "S1", eq: "P1-1", type: "repair", title: "搬送チェーン伸びによる停止位置ずれ", desc: "パレット停止位置が約8mmずれ、溶接ロボット側でワークを掴み損ねる。", cause: "ローラチェーンの経年伸び（給油不足による摩耗）", action: "ローラチェーン・スプロケット交換。給油周期を週1回に変更するよう保全担当へ指導。", reported: -400, done: -395, status: "done", assignee: "u09", billing: "paid", parts: [["M-3006", 12], ["M-3007", 2]], hours: 10, amount: 268_000, reporter: "田村 浩之 様（生産技術課）" },
  { key: "S2", eq: "P1-1", type: "inspection", title: "年次定期点検", desc: "年次の定期点検契約に基づく点検。", cause: "—", action: "駆動部・安全装置・制御盤の点検。チェーン伸び率 1.2%（基準内）。", reported: -330, done: -328, status: "done", assignee: "u09", billing: "paid", parts: [], hours: 6, amount: 120_000, reporter: "石井 達也 様" },
  { key: "S3", eq: "P1-1", type: "modification", title: "搬送能力増強（ライン更新）の相談", desc: "生産量増加に伴い、能力を45→60個/分に増強したい。チェーン保全の負荷も軽減したい。", cause: "生産計画の変更", action: "営業へ引継ぎ。更新案件として見積対応（→ 案件化）。", reported: -80, done: -72, status: "done", assignee: "u08", billing: "free", parts: [], hours: 3, amount: 0, reporter: "田村 浩之 様（生産技術課）", linked: "A11" },
  { key: "S4", eq: "P2-1", type: "parts", title: "高圧ポンプ メカニカルシール交換", desc: "洗浄ポンプ軸封部からの液漏れ。", cause: "メカニカルシールの摩耗（推奨交換周期：2年）", action: "メカニカルシール交換、ポンプ芯出し調整。", reported: -200, done: -196, status: "done", assignee: "u09", billing: "paid", parts: [], hours: 5, amount: 185_000, reporter: "石井 達也 様（保全課）" },
  { key: "S5", eq: "P2-1", type: "repair", title: "洗浄槽ヒーター断線", desc: "洗浄槽の液温が上がらず、温度異常アラームで停止。", cause: "シーズヒーター断線（絶縁抵抗低下）", action: "ヒーター手配中。仮対応として外部温水で運転継続中。", reported: -12, due: 6, status: "waiting_parts", assignee: "u09", billing: "paid", parts: [["F-8004", 1]], hours: 4, amount: 420_000, reporter: "石井 達也 様（保全課）" },
  { key: "S6", eq: "P4-1", type: "inspection", title: "定期点検（減速機オイル交換）", desc: "納入後年次点検。", cause: "—", action: "減速機オイル交換、メカシール点検、ロードセル校正。", reported: -60, done: -58, status: "done", assignee: "u08", billing: "paid", parts: [], hours: 8, amount: 220_000, reporter: "林 秀樹 様（設備技術部）" },
  { key: "S7", eq: "P5-1", type: "repair", title: "画像センサ誤判定の増加", desc: "良品をNG判定する頻度が増加（過検出 3%）。", cause: "LED照明の経年劣化による照度低下", action: "リング照明2台交換、判定閾値を再調整。", reported: -150, done: -147, status: "done", assignee: "u09", billing: "paid", parts: [["F-8015", 2]], hours: 6, amount: 196_000, reporter: "長谷川 修 様" },
  { key: "S8", eq: "P5-1", type: "inquiry", title: "判定閾値の設定方法について", desc: "新機種追加時の閾値設定手順を確認したい。", cause: "—", action: "電話・リモートで設定手順を説明。手順書を送付。", reported: -20, done: -20, status: "done", assignee: "u09", billing: "free", parts: [], hours: 1, amount: 0, reporter: "村上 健太 様" },
  { key: "S9", eq: "P6-1", type: "repair", title: "シール不良（ヒーター温度ばらつき）", desc: "ピロー包装のシール強度不足が散発。", cause: "温度調節器の設定ずれ・熱電対の接触不良", action: "熱電対交換、温調器のPID再調整。保証対応。", reported: -40, done: -36, status: "done", assignee: "u08", billing: "warranty", parts: [["S-2006", 2]], hours: 7, amount: 0, reporter: "藤田 誠一 様（製造技術部）" },
  { key: "S10", eq: "P7-1", type: "parts", title: "真空パッド定期交換", desc: "定期交換部品（真空パッド）の手配依頼。", cause: "定期交換", action: "部品手配のうえ、次回訪問時に交換予定。", reported: -6, due: 12, status: "received", assignee: "u09", billing: "paid", parts: [["P-5005", 8]], hours: 2, amount: 48_000, reporter: "福田 沙織 様（調達部）" },
  { key: "S11", eq: "P8-1", type: "inspection", title: "納入6ヶ月点検", desc: "保証期間内の初回点検。", cause: "—", action: "点検実施中。ファンベアリングの異音を確認、追加調査。", reported: -5, due: 9, status: "in_progress", assignee: "u08", billing: "warranty", parts: [], hours: 4, amount: 0, reporter: "佐々木 隆之 様（工務部）" },
  { key: "S12", eq: "P11-1", type: "modification", title: "乾燥ゾーン追加の相談", desc: "洗浄後の水滴残りにより、充填前のエアブロー工程で人手がかかっている。", cause: "製品切替（大型ボトル）による水切れ悪化", action: "現地調査のうえ、乾燥ゾーン追加改造を提案（→ 案件化）。", reported: -45, done: -30, status: "done", assignee: "u08", billing: "free", parts: [], hours: 5, amount: 0, reporter: "遠藤 理恵 様（技術課）", linked: "A13" },
  { key: "S13", eq: "P10-1", type: "repair", title: "仕分けダイバーター動作不良", desc: "5番方面のダイバーターが戻らず、ケースが滞留する。", cause: "調査中（エアシリンダ不良の可能性）", action: "本日訪問予定。", reported: -1, due: 2, status: "received", assignee: "u09", billing: "warranty", parts: [["P-5001", 1]], hours: 0, amount: 0, reporter: "近藤 大樹 様（センター長）" },
  { key: "S14", eq: "P9-1", type: "parts", title: "主軸ベアリング交換", desc: "主軸からの異音・振動増加。", cause: "ベアリングの寿命", action: "主軸ベアリング交換、振動値確認（基準内）。", reported: -300, done: -296, status: "done", assignee: "u09", billing: "paid", parts: [["M-3004", 4]], hours: 9, amount: 240_000, reporter: "西村 和也 様（技術部）" },
  { key: "S15", eq: "P3-2", type: "repair", title: "ベルト蛇行", desc: "2号ラインのベルトが片寄り、ガイドと接触。", cause: "テンション調整ボルトの緩み（洗浄時の分解・組立による）", action: "テンション再調整、ゆるみ止め対策を実施。分解洗浄時の注意点を指導。", reported: -100, done: -99, status: "done", assignee: "u09", billing: "free", parts: [], hours: 3, amount: 0, reporter: "山口 剛 様（工務課）" },
];

export function createSeed(): DB {
  const rand = mulberry32(20261027);
  const r = (min: number, max: number) => min + rand() * (max - min);
  const ri = (min: number, max: number) => Math.floor(r(min, max + 1));
  const base = today();
  const D = (off: number) => addDays(base, off);
  const TS = (off: number, h = 10, m = 0) => {
    const d = toDate(D(off));
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  let seq = 0;
  const id = (p: string) => `${p}_${(++seq).toString(36).padStart(4, "0")}`;
  const round = (n: number, unit = 10000) => Math.round(n / unit) * unit;

  // ── マスタ ──
  const parts: Part[] = PART_ROWS.map(([partNo, name, spec, category, maker, unit, standardCost, supplierId, leadTimeDays, procurement]) => ({
    id: `pt_${partNo}`,
    partNo,
    name,
    spec,
    category,
    maker,
    unit,
    standardCost,
    supplierId: supplierId || undefined,
    leadTimeDays,
    procurement,
  }));
  const partMap = new Map(parts.map((p) => [p.partNo, p]));

  const bomTemplates: BomTemplate[] = MODULES.map((m, mi) => {
    const items: BomTemplateItem[] = [
      { key: "root", parentKey: null, partNo: `ASSY-${String(mi + 1).padStart(3, "0")}`, name: m.name.replace(/（.*?）/, ""), spec: "", material: "", maker: "自社", qty: 1, unit: "式", unitCost: 0, procurement: "make" },
      ...m.children.map(([pn, qty], ci) => {
        const p = partMap.get(pn)!;
        return {
          key: `c${ci}`,
          parentKey: "root",
          partNo: p.partNo,
          name: p.name,
          spec: p.spec,
          material: p.category === "材料" ? p.name.split(" ")[0] : "",
          maker: p.maker,
          qty,
          unit: p.unit,
          unitCost: p.standardCost,
          procurement: p.procurement,
          supplierId: p.supplierId,
          leadTimeDays: p.leadTimeDays,
        } satisfies BomTemplateItem;
      }),
    ];
    return { id: m.id, name: m.name, equipmentType: m.type, description: m.desc, items, createdAt: TS(-900 + mi * 20) };
  });
  const tplMap = new Map(bomTemplates.map((t) => [t.id, t]));

  const customers: Customer[] = CUSTOMERS.map((c, i) => ({ ...c, createdAt: TS(-1800 + i * 90) }));
  const custMap = new Map(customers.map((c) => [c.id, c]));
  const siteMap = new Map(SITES.map((s) => [s.id, s]));

  // ── 案件 ──
  const cases: Case[] = [];
  const quotes: Quote[] = [];
  const pos: PurchaseOrder[] = [];
  const equipment: Equipment[] = [];
  const caseByKey = new Map<string, Case>();
  const eqByKey = new Map<string, Equipment>();
  const caseDefByKey = new Map<string, CaseDef>();

  const makeCost = (def: CaseDef, amount: number): CostBreakdown => {
    const ratio = COST_RATIO[def.type];
    const total = amount * (1 - def.margin);
    const c = {} as CostBreakdown;
    (Object.keys(ratio) as (keyof CostBreakdown)[]).forEach((k) => {
      c[k] = round(total * ratio[k] * r(0.94, 1.06), 1000);
    });
    return c;
  };

  const approvals = (states: ("approved" | "waiting")[], users: string[], at: number): ApprovalStep[] =>
    ["担当", "課長", "部長"].map((label, i) => ({
      label,
      level: i as 0 | 1 | 2,
      status: states[i] ?? "approved",
      userId: (states[i] ?? "approved") === "approved" ? users[i] : undefined,
      at: (states[i] ?? "approved") === "approved" ? TS(at + i, 9 + i * 2, 15 + i * 10) : undefined,
    }));

  const managerOf = (salesId: string) => (salesId === "u01" ? "u03" : "u03");
  const directorOf = () => "u01";

  for (const def of CASES) {
    caseDefByKey.set(def.key, def);
    const stageIdx = STAGE_INDEX[def.stage];
    const isOrdered = stageIdx >= STAGE_INDEX.ordered && def.status !== "lost";
    const orderOff = def.order;
    const inquiryOff = def.inquiry ?? (orderOff !== undefined ? orderOff - ri(45, 75) : -10);
    const cust = custMap.get(def.cust)!;
    const site = siteMap.get(def.site)!;
    const qty = def.qty ?? 1;
    const caseId = `cs_${def.key}`;
    const spec: Spec = { ...DEFAULT_SPEC, ...def.spec, capacityUnit: EQUIPMENT_TYPES[def.type].capacityUnit };
    const costEstimate = makeCost(def, def.amount);
    const estTotal = Object.values(costEstimate).reduce((a, b) => a + b, 0);

    const deliveryOff = orderOff !== undefined && def.lead ? orderOff + def.lead : undefined;
    const desiredOff = deliveryOff ?? inquiryOff + ri(180, 260);

    // ── 見積 ──
    let quoteStates: QuoteStatus[] = def.quoteStates ?? [];
    if (!def.quoteStates && stageIdx >= STAGE_INDEX.quotation) {
      quoteStates = stageIdx >= STAGE_INDEX.ordered ? ["submitted", "accepted"] : ["submitted"];
    }
    const quoteOff = inquiryOff + ri(10, 16);
    const caseQuotes: Quote[] = quoteStates.map((st, qi) => {
      const issueOff = Math.min(quoteOff + qi * ri(9, 14), -1);
      const priceTarget = def.amount * (qi === quoteStates.length - 1 ? 1 : r(1.03, 1.08));
      const opt = spec.options.slice(0, 3);
      const lines: [string, string, number][] = [
        [`${def.title} 本体`, `${EQUIPMENT_TYPES[def.type].label}／処理能力 ${spec.capacity.toLocaleString()}${spec.capacityUnit}`, 0.6],
        ["制御盤・電気配線工事", spec.control, 0.16],
        ...opt.map((o) => [`オプション：${o}`, "", 0.03] as [string, string, number]),
        ["据付・試運転調整", `${site.name}にて`, 0.09],
        ["取扱説明書・完成図書", "紙2部＋電子データ", 0.02],
        ["輸送費", "トラック輸送（チャーター便）", 0.03],
      ];
      const sumShare = lines.reduce((s, l) => s + l[2], 0);
      const discount = qi === quoteStates.length - 1 ? def.discount ?? 0 : 0;
      const items: QuoteItem[] = lines.map(([name, specText, share]) => {
        const price = round((priceTarget * share) / sumShare / qty, 10000);
        return {
          id: id("qi"),
          name,
          spec: specText,
          qty: name.endsWith("本体") ? qty : 1,
          unit: name.endsWith("本体") ? "台" : "式",
          unitPrice: name.endsWith("本体") ? price : round((priceTarget * share) / sumShare, 10000),
          unitCost: 0,
        };
      });
      // 合計を目標金額に合わせる
      const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
      items[0].unitPrice += round((priceTarget + discount - subtotal) / items[0].qty, 10000);
      const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
      items.forEach((it) => {
        it.unitCost = round(((it.unitPrice * it.qty) / total) * estTotal * r(0.96, 1.04) / it.qty, 1000);
      });
      const quoteApprovals =
        st === "draft"
          ? approvals(["waiting", "waiting", "waiting"], [def.sales], issueOff)
          : st === "pending"
            ? approvals(["approved", "waiting", "waiting"], [def.sales], issueOff)
            : approvals(["approved", "approved", "approved"], [def.sales, managerOf(def.sales), directorOf()], issueOff - 2);
      return {
        id: id("qt"),
        caseId,
        quoteNo: "",
        revision: qi + 1,
        issueDate: D(issueOff),
        validUntil: D(issueOff + 60),
        status: st,
        subject: def.title,
        deliveryTerms: deliveryOff !== undefined ? `ご発注後 ${Math.round((def.lead ?? 150) / 30)}ヶ月` : `ご発注後 ${ri(5, 7)}ヶ月`,
        deliveryPlace: `貴社 ${site.name}`,
        paymentTerms: cust.paymentTerms,
        items,
        discount,
        notes: "・本見積には消費税は含まれておりません。\n・据付時の電源・エア元配管は貴社ご支給とさせていただきます。\n・仕様変更が生じた場合は、別途お見積りさせていただきます。",
        createdBy: def.sales,
        approvals: quoteApprovals,
        createdAt: TS(issueOff - 3),
      } satisfies Quote;
    });
    quotes.push(...caseQuotes);

    // ── 取引審査 ──
    let review: DealReview = { status: "none", checks: REVIEW_CHECK_ITEMS.map((label) => ({ label, ok: null })), riskNotes: "", approvals: [] };
    const reviewOff = (orderOff ?? inquiryOff + 45) - 6;
    if (stageIdx >= STAGE_INDEX.review) {
      const states = isOrdered ? (["approved", "approved", "approved"] as const) : def.reviewApprovals ?? ["approved", "waiting", "waiting"];
      const allOk = states.every((s) => s === "approved");
      review = {
        status: def.status === "lost" ? "rejected" : allOk ? "approved" : "pending",
        requestedAt: TS(reviewOff),
        requestedBy: def.sales,
        checks: REVIEW_CHECK_ITEMS.map((label, i) => ({ label, ok: allOk ? true : i < 4 ? true : null })),
        riskNotes: cust.creditRank === "C" ? "与信ランクC。着手金30%の前受を条件とする。" : def.key === "A9" ? "1号機で組立工数超過の実績あり。試作検証費を計上済みでリスクは低減。" : "特記事項なし。",
        approvals: approvals([...states], [def.sales, managerOf(def.sales), "u10"], Math.min(reviewOff, -1)),
      };
    }

    // ── 受注 ──
    const lastQuote = caseQuotes[caseQuotes.length - 1];
    const orderAmount = lastQuote ? lastQuote.items.reduce((s, i) => s + i.qty * i.unitPrice, 0) - lastQuote.discount : def.amount;
    const order = isOrdered && orderOff !== undefined
      ? {
          orderDate: D(orderOff),
          orderAmount,
          customerPoNo: `${cust.code.replace("C-", "PO")}-${String(ri(1000, 9999))}`,
          deliveryDate: D(deliveryOff!),
          deliveryPlace: `${cust.name} ${site.name}`,
          paymentTerms: cust.paymentTerms,
          quantity: qty,
        }
      : undefined;

    const workIssued = stageIdx >= STAGE_INDEX.design && orderOff !== undefined;

    // ── BOM ──
    let bom: BomItem[] = [];
    if (workIssued) {
      const modIds = def.modules ?? TYPE_MODULES[def.type];
      let sort = 0;
      const full: BomItem[] = [];
      modIds.forEach((mid) => {
        const tpl = tplMap.get(mid)!;
        const items = instantiateTemplate(tpl, sort++, null, () => id("bom"));
        items.forEach((it) => {
          if (it.parentId) it.unitCost = round(it.unitCost * r(0.95, 1.05), 10);
        });
        full.push(...items);
      });
      // 外注加工品（F-）の単価を見積の材料費＋購入品費に整合させる
      const target = (costEstimate.material + costEstimate.purchased) * r(0.95, 1.06);
      const leaves = full.filter((i) => i.parentId);
      const fTotal = leaves.filter((i) => i.partNo.startsWith("F-")).reduce((s, i) => s + i.unitCost * i.qty, 0);
      const other = leaves.filter((i) => !i.partNo.startsWith("F-")).reduce((s, i) => s + i.unitCost * i.qty, 0);
      const scale = fTotal > 0 ? Math.max(0.4, (target - other) / fTotal) : 1;
      leaves.forEach((i) => {
        if (i.partNo.startsWith("F-")) i.unitCost = round(i.unitCost * scale, 1000);
      });
      if (def.stage === "design") {
        const roots = full.filter((i) => !i.parentId);
        const keep = new Set(roots.slice(0, Math.ceil(roots.length * 0.6)).map((i) => i.id));
        bom = full.filter((i) => (i.parentId ? keep.has(i.parentId) : keep.has(i.id)));
      } else {
        bom = full;
      }
      // 製缶フレームの材質を仕様に合わせる
      bom.forEach((i) => {
        if (i.partNo === "F-8001") i.material = spec.material;
      });
    }

    // ── 購買 ──
    if (stageIdx >= STAGE_INDEX.procurement && orderOff !== undefined) {
      const leaves = bom.filter((i) => i.parentId && i.procurement === "buy" && i.supplierId);
      const bySupplier = new Map<string, BomItem[]>();
      leaves.forEach((l) => bySupplier.set(l.supplierId!, [...(bySupplier.get(l.supplierId!) ?? []), l]));
      const groups = [...bySupplier.entries()];
      groups.forEach(([supId, lines], gi) => {
        const issueOff = Math.min(orderOff + ri(22, 38), -2);
        const lt = Math.max(...lines.map((l) => l.leadTimeDays ?? 14));
        let status: PurchaseOrder["status"] = "received";
        if (def.stage === "procurement") {
          status = gi < groups.length * 0.45 ? "received" : gi < groups.length * 0.8 ? "ordered" : "requested";
        } else if (def.stage === "manufacturing") {
          status = gi === groups.length - 1 ? "partial" : "received";
        }
        const dueOff = issueOff + lt;
        const po: PurchaseOrder = {
          id: id("po"),
          poNo: "",
          caseId,
          supplierId: supId,
          issueDate: D(issueOff),
          dueDate: D(status === "received" ? Math.min(dueOff, -1) : Math.max(dueOff, 3)),
          status,
          lines: lines.map((l) => ({ id: id("pl"), bomItemId: l.id, partNo: l.partNo, name: l.name, spec: l.spec, qty: l.qty * qty, unit: l.unit, unitPrice: l.unitCost })),
          notes: "",
          createdBy: "u06",
          receivedDate: status === "received" ? D(Math.min(dueOff - ri(0, 3), -1)) : undefined,
        };
        lines.forEach((l) => (l.poId = po.id));
        pos.push(po);
      });
    }

    // ── 製造工程 ──
    let processes: ProcessStep[] = [];
    if (workIssued && orderOff !== undefined && deliveryOff !== undefined) {
      const start = orderOff + 3;
      const end = deliveryOff - 8;
      const span = end - start;
      let cursor = start;
      const assignees = [def.eng, "u06", "u07", "u07", "u07", "u07", def.eng, "u07", "u07"];
      processes = DEFAULT_PROCESSES.map((p, i) => {
        const len = Math.max(2, Math.round(span * p.weight));
        const s = i === 1 ? cursor - Math.round(len * 0.4) : cursor; // 部品手配は設計と並行
        const e = s + len;
        cursor = e;
        let progress = 0;
        let status: ProcessStep["status"] = "todo";
        if (e < 0) {
          progress = 100;
          status = "done";
        } else if (s <= 0) {
          progress = Math.min(95, Math.max(5, Math.round(((0 - s) / Math.max(1, e - s)) * 100)));
          status = "doing";
        }
        return { id: id("pr"), name: p.name, startDate: D(s), endDate: D(e), progress, status, assigneeId: assignees[i] };
      });
      if (def.stage === "delivery" || def.stage === "aftercare") {
        processes.forEach((p) => {
          p.progress = 100;
          p.status = "done";
        });
      }
      if (def.delayed) {
        const doing = processes.find((p) => p.status === "doing");
        if (doing) doing.status = "delayed";
      }
    }

    // ── 出荷 ──
    let shipment: Case["shipment"] = {};
    if (def.stage === "delivery" && deliveryOff !== undefined) {
      shipment = { plannedShipDate: D(deliveryOff - 3), inspectionDate: D(-4), carrier: "中部運輸（10tウイング車）", notes: "立会検査にて軽微な指摘2件（カバー固定ねじ追加・表示灯位置変更）。出荷前に対応済み。" };
    } else if (def.stage === "aftercare" && deliveryOff !== undefined) {
      shipment = {
        plannedShipDate: D(deliveryOff - 3),
        inspectionDate: D(deliveryOff - 14),
        shippedDate: D(deliveryOff - 3),
        deliveredDate: D(deliveryOff),
        acceptanceDate: D(deliveryOff + 14),
        deliveryNoteNo: `DN-${yy(D(deliveryOff))}${String(ri(100, 999))}`,
        carrier: "中部運輸（10tウイング車）",
        notes: "据付・試運転完了。客先立会のもと検収。",
      };
    }

    // ── 実績原価 ──
    let actualCost: CostBreakdown | undefined;
    if (def.stage === "aftercare") {
      actualCost = {} as CostBreakdown;
      (Object.keys(costEstimate) as (keyof CostBreakdown)[]).forEach((k) => {
        const over = def.overrun?.[k] ?? 0;
        actualCost![k] = round(costEstimate[k] * (r(0.93, 1.08) + over), 1000);
      });
    }

    const c: Case = {
      id: caseId,
      dealNo: "",
      workNo: undefined,
      title: def.title,
      customerId: def.cust,
      siteId: def.site,
      equipmentType: def.type,
      stage: def.stage,
      status: def.status ?? "active",
      lostReason: def.lostReason,
      salesRepId: def.sales,
      engineerId: def.eng,
      inquiryDate: D(inquiryOff),
      inquiryChannel: def.channel,
      desiredDeliveryDate: D(desiredOff),
      budget: def.key === "A6" ? 65_000_000 : undefined,
      expectedAmount: order?.orderAmount ?? def.amount,
      probability: def.prob ?? "A",
      description: def.desc,
      specs: spec,
      costEstimate,
      costCheckedBy: stageIdx >= STAGE_INDEX.quotation || def.stage === "costing" ? def.eng ?? "u04" : undefined,
      costCheckedAt: stageIdx >= STAGE_INDEX.quotation ? TS(inquiryOff + 7, 15) : def.stage === "costing" ? TS(-2, 16) : undefined,
      actualCost,
      review,
      order,
      workNoIssuedAt: workIssued ? TS(orderOff! + 1, 9, 30) : undefined,
      bom,
      processes,
      shipment,
      sourceEquipmentId: undefined,
      sourceServiceId: undefined,
      referenceCaseIds: [],
      notes: (def.notes ?? []).map(([userId, text, pinned, off], ni) => ({ id: id("nt"), userId, text, pinned: !!pinned, at: TS(off ?? Math.min(inquiryOff + 5 + ni * 7, -1), 17, 20) }) satisfies Note),
      tags: def.tags ?? [],
      createdAt: TS(inquiryOff, 9),
      updatedAt: TS(Math.min(-1, (orderOff ?? inquiryOff) + 20), 15),
    };
    if (def.stage === "costing" && !c.costCheckedAt) c.costCheckedAt = undefined;
    cases.push(c);
    caseByKey.set(def.key, c);

    // ── 装置 ──
    if (def.stage === "aftercare" && deliveryOff !== undefined) {
      for (let u = 1; u <= qty; u++) {
        const eq: Equipment = {
          id: `eq_${def.key}_${u}`,
          serialNo: "",
          name: qty > 1 ? `${def.title}（${u}号機）` : def.title,
          model: `${def.type.slice(0, 3).toUpperCase()}-${spec.capacity}${u > 1 ? "" : ""}`,
          equipmentType: def.type,
          caseId,
          workNo: "",
          customerId: def.cust,
          siteId: def.site,
          location: def.location ?? site.name,
          deliveredDate: D(deliveryOff),
          warrantyUntil: D(deliveryOff + 365),
          status: u === 1 ? def.eqStatus ?? "running" : "running",
          specs: spec,
          notes: "",
        };
        equipment.push(eq);
        eqByKey.set(`${def.key}-${u}`, eq);
      }
    }
  }

  // 参照関係
  for (const def of CASES) {
    const c = caseByKey.get(def.key)!;
    c.referenceCaseIds = (def.refs ?? []).map((k) => caseByKey.get(k)!.id);
    if (def.sourceEq) c.sourceEquipmentId = eqByKey.get(`${def.sourceEq}-1`)?.id;
  }

  // ── サービス ──
  const services: ServiceRecord[] = SERVICES.map((s) => {
    const eq = eqByKey.get(s.eq)!;
    return {
      id: `sv_${s.key}`,
      ticketNo: "",
      equipmentId: eq.id,
      type: s.type,
      title: s.title,
      description: s.desc,
      cause: s.cause,
      action: s.action,
      reportedDate: D(s.reported),
      dueDate: s.due !== undefined ? D(s.due) : undefined,
      completedDate: s.done !== undefined ? D(s.done) : undefined,
      status: s.status,
      assigneeId: s.assignee,
      billing: s.billing,
      parts: s.parts.map(([pn, q]) => {
        const p = partMap.get(pn)!;
        return { id: id("sp"), partNo: p.partNo, name: p.name, qty: q, unitPrice: round(p.standardCost * 1.35, 100) };
      }),
      laborHours: s.hours,
      amount: s.amount,
      linkedCaseId: s.linked ? caseByKey.get(s.linked)!.id : undefined,
      reporter: s.reporter,
      createdAt: TS(s.reported, 9, 40),
    };
  });
  for (const def of CASES) {
    if (def.sourceSvc) caseByKey.get(def.key)!.sourceServiceId = `sv_${def.sourceSvc}`;
  }

  // ── 採番 ──
  const counters: DB["counters"] = { deal: {}, work: {}, po: {}, service: {}, customer: customers.length, part: parts.length };
  [...cases]
    .sort((a, b) => a.inquiryDate.localeCompare(b.inquiryDate))
    .forEach((c) => {
      const y = yy(c.inquiryDate);
      counters.deal[y] = (counters.deal[y] ?? 0) + ri(2, 6);
      c.dealNo = `T${y}-${String(counters.deal[y]).padStart(4, "0")}`;
    });
  quotes.forEach((q) => {
    const c = cases.find((x) => x.id === q.caseId)!;
    q.quoteNo = `${c.dealNo.replace(/^T/, "M")}-${String(q.revision).padStart(2, "0")}`;
  });
  [...cases]
    .filter((c) => c.workNoIssuedAt)
    .sort((a, b) => a.workNoIssuedAt!.localeCompare(b.workNoIssuedAt!))
    .forEach((c) => {
      const y = yy(c.workNoIssuedAt!);
      counters.work[y] = (counters.work[y] ?? 100) + ri(1, 4);
      c.workNo = `K${y}-${String(counters.work[y]).padStart(3, "0")}`;
    });
  equipment.forEach((e) => {
    const c = cases.find((x) => x.id === e.caseId)!;
    e.workNo = c.workNo!;
    const unit = Number(e.id.split("_").pop());
    e.serialNo = `${c.workNo}-${String(unit).padStart(2, "0")}`;
    e.model = `${EQUIPMENT_TYPES[e.equipmentType].label.slice(0, 2)}-${c.workNo!.replace("K", "")}`;
  });
  [...pos]
    .sort((a, b) => a.issueDate.localeCompare(b.issueDate))
    .forEach((p) => {
      const y = yy(p.issueDate);
      counters.po[y] = (counters.po[y] ?? 0) + ri(1, 3);
      p.poNo = `P${y}-${String(counters.po[y]).padStart(4, "0")}`;
    });
  [...services]
    .sort((a, b) => a.reportedDate.localeCompare(b.reportedDate))
    .forEach((s) => {
      const y = yy(s.reportedDate);
      counters.service[y] = (counters.service[y] ?? 0) + ri(1, 4);
      s.ticketNo = `S${y}-${String(counters.service[y]).padStart(4, "0")}`;
    });

  // ── 資料（Google Drive 連携イメージ） ──
  const documents: DocFile[] = [];
  const addDoc = (d: Omit<DocFile, "id" | "size" | "version"> & { size?: number; version?: number }) =>
    documents.push({ id: id("doc"), size: d.size ?? ri(80, 4200) * 1024, version: d.version ?? 1, ...d });
  const userOf = (uid?: string) => uid ?? "u11";

  for (const c of cases) {
    const sIdx = STAGE_INDEX[c.stage];
    const inq = diffDays(c.inquiryDate, base);
    const cust = custMap.get(c.customerId)!;
    addDoc({ caseId: c.id, folder: "01_引合・見積", name: `引合メモ_${c.title}`, kind: "minutes", fileType: "gdoc", updatedAt: TS(inq, 11), updatedBy: c.salesRepId });
    addDoc({ caseId: c.id, folder: "02_仕様・打合せ", name: `客先仕様書_${cust.name}.pdf`, kind: "spec", fileType: "pdf", updatedAt: TS(inq + 1, 14), updatedBy: c.salesRepId });
    if (sIdx >= STAGE_INDEX.costing) {
      addDoc({ caseId: c.id, folder: "01_引合・見積", name: `見積原価計算書_${c.dealNo}.xlsx`, kind: "quote", fileType: "gsheet", updatedAt: TS(inq + 7, 16), updatedBy: c.engineerId ?? "u04", version: ri(1, 3) });
    }
    quotes
      .filter((q) => q.caseId === c.id && q.status !== "draft")
      .forEach((q) => addDoc({ caseId: c.id, folder: "01_引合・見積", name: `御見積書_${q.quoteNo}.pdf`, kind: "quote", fileType: "pdf", updatedAt: q.createdAt, updatedBy: q.createdBy }));
    if (sIdx >= STAGE_INDEX.quotation) {
      addDoc({ caseId: c.id, folder: "02_仕様・打合せ", name: `仕様打合せ議事録_第1回`, kind: "minutes", fileType: "gdoc", updatedAt: TS(inq + 12, 17), updatedBy: c.salesRepId });
      addDoc({ caseId: c.id, folder: "02_仕様・打合せ", name: `構想図_${c.title}.pdf`, kind: "drawing", fileType: "pdf", updatedAt: TS(inq + 10, 13), updatedBy: c.engineerId ?? "u04" });
    }
    if (sIdx >= STAGE_INDEX.review) {
      addDoc({ caseId: c.id, folder: "01_引合・見積", name: `取引審査票_${c.dealNo}`, kind: "report", fileType: "gsheet", updatedAt: c.review.requestedAt ?? TS(-3), updatedBy: c.salesRepId });
    }
    if (c.order) {
      const od = diffDays(c.order.orderDate, base);
      addDoc({ caseId: c.id, folder: "01_引合・見積", name: `注文書_${cust.name}_${c.order.customerPoNo}.pdf`, kind: "order", fileType: "pdf", updatedAt: TS(od, 10), updatedBy: c.salesRepId });
    }
    if (c.workNo) {
      const od = diffDays(c.order!.orderDate, base);
      addDoc({ caseId: c.id, folder: "01_引合・見積", name: `社内注文書_${c.workNo}.pdf`, kind: "order", fileType: "pdf", updatedAt: TS(od + 1, 10), updatedBy: c.salesRepId });
      addDoc({ caseId: c.id, folder: "03_設計図面", name: `${c.workNo}_全体組立図.dwg`, kind: "drawing", fileType: "dwg", updatedAt: TS(od + 15, 18), updatedBy: c.engineerId ?? "u04", version: ri(2, 5), size: ri(2000, 9000) * 1024 });
      addDoc({ caseId: c.id, folder: "03_設計図面", name: `${c.workNo}_電気回路図.pdf`, kind: "drawing", fileType: "pdf", updatedAt: TS(od + 20, 18), updatedBy: c.engineerId ?? "u04", version: ri(1, 3) });
    }
    if (sIdx >= STAGE_INDEX.procurement && c.order) {
      const od = diffDays(c.order.orderDate, base);
      addDoc({ caseId: c.id, folder: "04_購買", name: `手配一覧_${c.workNo}`, kind: "purchase", fileType: "gsheet", updatedAt: TS(Math.min(od + 30, -1), 15), updatedBy: "u06" });
    }
    if (sIdx >= STAGE_INDEX.manufacturing && c.order) {
      addDoc({ caseId: c.id, folder: "05_製造・検査", name: `組立状況写真_${c.workNo}.jpg`, kind: "photo", fileType: "jpg", updatedAt: TS(-ri(2, 20), 16), updatedBy: "u07", size: ri(1500, 6000) * 1024 });
    }
    if (sIdx >= STAGE_INDEX.delivery && c.order) {
      addDoc({ caseId: c.id, folder: "05_製造・検査", name: `社内検査成績書_${c.workNo}.pdf`, kind: "inspection", fileType: "pdf", updatedAt: TS(c.stage === "delivery" ? -6 : diffDays(c.shipment.inspectionDate!, base) - 2, 17), updatedBy: "u07" });
    }
    if (c.stage === "aftercare") {
      const dd = diffDays(c.shipment.deliveredDate!, base);
      addDoc({ caseId: c.id, folder: "06_出荷・納品", name: `納品書_${c.shipment.deliveryNoteNo}.pdf`, kind: "order", fileType: "pdf", updatedAt: TS(dd, 15), updatedBy: c.salesRepId });
      addDoc({ caseId: c.id, folder: "06_出荷・納品", name: `取扱説明書_${c.title}.pdf`, kind: "manual", fileType: "pdf", updatedAt: TS(dd - 5, 15), updatedBy: c.engineerId ?? "u04", size: ri(4000, 12000) * 1024 });
      addDoc({ caseId: c.id, folder: "06_出荷・納品", name: `完成図書一式_${c.workNo}.zip`, kind: "other", fileType: "zip", updatedAt: TS(dd + 3, 11), updatedBy: c.engineerId ?? "u04", size: ri(20000, 80000) * 1024 });
      addDoc({ caseId: c.id, folder: "06_出荷・納品", name: `検収書_${cust.name}.pdf`, kind: "order", fileType: "pdf", updatedAt: TS(dd + 14, 11), updatedBy: c.salesRepId });
    }
  }
  services.forEach((s) => {
    const eq = equipment.find((e) => e.id === s.equipmentId)!;
    if (s.status === "done") {
      addDoc({ caseId: eq.caseId, equipmentId: eq.id, serviceId: s.id, folder: "07_アフターサービス", name: `サービス報告書_${s.ticketNo}.pdf`, kind: "report", fileType: "pdf", updatedAt: TS(diffDays(s.completedDate!, base), 17), updatedBy: s.assigneeId });
    }
  });

  // ── 操作履歴 ──
  const activities: Activity[] = [];
  const act = (at: string, userId: string, entity: Activity["entity"], entityId: string, message: string, caseId?: string) =>
    activities.push({ id: id("ac"), at, userId, entity, entityId, caseId, message });
  for (const c of cases) {
    const inq = diffDays(c.inquiryDate, base);
    const sIdx = STAGE_INDEX[c.stage];
    act(TS(inq, 9, 5), c.salesRepId, "case", c.id, `引合を登録しました（${c.dealNo}）`, c.id);
    if (c.costCheckedAt) act(c.costCheckedAt, c.costCheckedBy ?? "u04", "case", c.id, `概算原価を確認しました`, c.id);
    quotes
      .filter((q) => q.caseId === c.id)
      .forEach((q) => {
        act(q.createdAt, q.createdBy, "quote", q.id, `見積書 ${q.quoteNo} を作成しました`, c.id);
        if (["submitted", "accepted", "declined"].includes(q.status)) act(TS(diffDays(q.issueDate, base), 16, 30), q.createdBy, "quote", q.id, `見積書 ${q.quoteNo} を客先へ提出しました`, c.id);
      });
    if (sIdx >= STAGE_INDEX.review && c.review.requestedAt) act(c.review.requestedAt, c.salesRepId, "case", c.id, `取引審査を申請しました`, c.id);
    if (c.review.status === "approved") act(c.review.approvals[2]?.at ?? c.review.requestedAt!, "u10", "case", c.id, `取引審査が承認されました`, c.id);
    if (c.order) act(TS(diffDays(c.order.orderDate, base), 14), c.salesRepId, "case", c.id, `受注を登録しました（受注金額 ¥${c.order.orderAmount.toLocaleString()}）`, c.id);
    if (c.workNo) act(c.workNoIssuedAt!, c.salesRepId, "case", c.id, `工事番号 ${c.workNo} を発行しました`, c.id);
    if (c.bom.length) act(TS(diffDays(c.order!.orderDate, base) + 10, 18), c.engineerId ?? "u04", "bom", c.id, `BOMを作成しました（標準モジュール ${c.bom.filter((b) => !b.parentId).length}件を展開）`, c.id);
    pos
      .filter((p) => p.caseId === c.id && p.status !== "requested")
      .forEach((p) => act(TS(diffDays(p.issueDate, base), 13), "u06", "po", p.id, `発注書 ${p.poNo} を発行しました（${SUPPLIERS.find((s) => s.id === p.supplierId)?.name}）`, c.id));
    if (c.shipment.shippedDate) act(TS(diffDays(c.shipment.shippedDate, base), 8), "u07", "case", c.id, `出荷しました`, c.id);
    if (c.shipment.deliveredDate) act(TS(diffDays(c.shipment.deliveredDate, base), 17), c.salesRepId, "case", c.id, `納品が完了し、装置台帳に登録しました`, c.id);
    if (c.status === "lost") act(TS(inq + 40, 11), c.salesRepId, "case", c.id, `失注として登録しました`, c.id);
    if (c.status === "onhold") act(TS(-20, 11), c.salesRepId, "case", c.id, `案件を保留にしました`, c.id);
  }
  services.forEach((s) => {
    const eq = equipment.find((e) => e.id === s.equipmentId)!;
    act(s.createdAt, s.assigneeId, "service", s.id, `サービス受付 ${s.ticketNo}：${s.title}`, eq.caseId);
    if (s.completedDate) act(TS(diffDays(s.completedDate, base), 18), s.assigneeId, "service", s.id, `サービス ${s.ticketNo} の対応が完了しました`, eq.caseId);
  });
  activities.sort((a, b) => b.at.localeCompare(a.at));

  // ── 通知 ──
  const cA9 = caseByKey.get("A9")!;
  const cA7 = caseByKey.get("A7")!;
  const cA16 = caseByKey.get("A16")!;
  const cA11 = caseByKey.get("A11")!;
  const cA18 = caseByKey.get("A18")!;
  const s13 = services.find((s) => s.id === "sv_S13")!;
  const s5 = services.find((s) => s.id === "sv_S5")!;
  const notifications: AppNotification[] = [
    { id: id("nf"), at: TS(0, 8, 40), title: "サービス受付", body: `${s13.ticketNo} 仕分けダイバーター動作不良（瀬戸内ロジスティクス）`, href: `/service/${s13.id}`, read: false, tone: "danger" },
    { id: id("nf"), at: TS(-1, 17, 10), title: "取引審査の承認依頼", body: `${cA9.dealNo} ${cA9.title}：部長承認待ち`, href: `/cases/${cA9.id}?tab=review`, read: false, tone: "warning" },
    { id: id("nf"), at: TS(-1, 11, 0), title: "見積承認の依頼", body: `${cA7.dealNo} ${cA7.title}：課長承認待ち`, href: `/cases/${cA7.id}?tab=quote`, read: false, tone: "warning" },
    { id: id("nf"), at: TS(-2, 15, 30), title: "工番未発行の受注案件", body: `${cA11.dealNo} ${cA11.title}：受注登録済み・工番未発行です`, href: `/cases/${cA11.id}`, read: false, tone: "info" },
    { id: id("nf"), at: TS(-3, 9, 0), title: "工程遅延", body: `${cA16.workNo} ${cA16.title}：攪拌槽の入荷遅れ`, href: `/cases/${cA16.id}?tab=production`, read: true, tone: "danger" },
    { id: id("nf"), at: TS(-4, 16, 45), title: "出荷予定", body: `${cA18.workNo} ${cA18.title}：まもなく出荷予定です`, href: `/cases/${cA18.id}?tab=shipment`, read: true, tone: "success" },
    { id: id("nf"), at: TS(-6, 10, 20), title: "部品手配中", body: `${s5.ticketNo} 洗浄槽ヒーター断線：ヒーター入荷待ち`, href: `/service/${s5.id}`, read: true, tone: "info" },
  ];

  return {
    initialized: true,
    seedVersion: SEED_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    users: USERS,
    customers,
    sites: SITES,
    suppliers: SUPPLIERS,
    parts,
    bomTemplates,
    cases,
    quotes,
    purchaseOrders: pos,
    equipment,
    services,
    documents,
    activities,
    notifications,
    counters,
  };
}
