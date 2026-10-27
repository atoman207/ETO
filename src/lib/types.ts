// ============================================================
// 匠帳 データモデル定義
// 顧客 → 拠点 → 案件（取引番号）→ 見積（見積番号）→ 工事番号 → 装置（製造番号）→ サービス履歴
// ============================================================

export type Role =
  | "admin"
  | "executive"
  | "sales"
  | "engineer"
  | "purchasing"
  | "production"
  | "service";

export type Permission =
  | "viewCost" // 原価・粗利の閲覧
  | "editCase" // 案件・見積の編集
  | "approve" // 見積承認・取引審査承認
  | "editBom" // BOM編集
  | "purchase" // 購買発注
  | "editProduction" // 製造工程の更新
  | "editService" // アフターサービス登録
  | "editMaster"; // マスタ・設定の編集

export interface User {
  id: string;
  name: string;
  kana: string;
  dept: string;
  title: string; // 役職
  role: Role;
  approvalLevel: 0 | 1 | 2; // 0:担当 1:課長 2:部長以上
  email: string;
  color: string; // アバター色
}

export interface Contact {
  id: string;
  name: string;
  dept: string;
  title: string;
  email: string;
  phone: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  kana: string;
  industry: string;
  address: string;
  phone: string;
  creditRank: "A" | "B" | "C" | "D";
  creditLimit: number;
  paymentTerms: string;
  salesRepId: string;
  notes: string;
  createdAt: string;
}

export interface Site {
  id: string;
  customerId: string;
  name: string;
  address: string;
  phone: string;
  contacts: Contact[];
}

export type Stage =
  | "inquiry"
  | "costing"
  | "quotation"
  | "review"
  | "ordered"
  | "workno"
  | "design"
  | "procurement"
  | "manufacturing"
  | "delivery"
  | "aftercare";

export type CaseStatus = "active" | "onhold" | "lost" | "completed";

export type EquipmentType =
  | "conveyor"
  | "washer"
  | "dryer"
  | "assembly"
  | "inspection"
  | "mixer"
  | "packaging"
  | "special";

export interface CustomField {
  label: string;
  value: string;
}

export interface Spec {
  capacity: number;
  capacityUnit: string;
  width: number;
  depth: number;
  height: number;
  power: string;
  material: string;
  control: string;
  environment: string;
  workpiece: string;
  options: string[];
  notes: string;
  customFields: CustomField[];
}

export interface CostBreakdown {
  design: number; // 設計費
  material: number; // 材料費
  purchased: number; // 購入品費
  machining: number; // 加工費
  assembly: number; // 組立・配線費
  testing: number; // 試運転・検査費
  transport: number; // 輸送・据付費
  overhead: number; // 諸経費
}

export type ApprovalStatus = "waiting" | "approved" | "rejected";

export interface ApprovalStep {
  label: string; // 担当 / 課長 / 部長
  level: 0 | 1 | 2;
  status: ApprovalStatus;
  userId?: string;
  at?: string;
  comment?: string;
}

export interface ReviewCheck {
  label: string;
  ok: boolean | null;
}

export interface DealReview {
  status: "none" | "pending" | "approved" | "rejected";
  requestedAt?: string;
  requestedBy?: string;
  checks: ReviewCheck[];
  riskNotes: string;
  approvals: ApprovalStep[];
}

export interface OrderInfo {
  orderDate: string;
  orderAmount: number;
  customerPoNo: string;
  deliveryDate: string;
  deliveryPlace: string;
  paymentTerms: string;
  quantity: number;
}

export type Procurement = "buy" | "make" | "supplied";

export interface BomItem {
  id: string;
  parentId: string | null;
  partNo: string;
  name: string;
  spec: string;
  material: string;
  maker: string;
  qty: number;
  unit: string;
  unitCost: number;
  procurement: Procurement;
  supplierId?: string;
  leadTimeDays?: number;
  note: string;
  poId?: string;
  sortOrder: number;
}

export type ProcessStatus = "todo" | "doing" | "done" | "delayed";

export interface ProcessStep {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: ProcessStatus;
  assigneeId?: string;
}

export interface Shipment {
  plannedShipDate?: string;
  inspectionDate?: string; // 立会検査日
  shippedDate?: string;
  deliveredDate?: string;
  acceptanceDate?: string; // 検収日
  deliveryNoteNo?: string;
  carrier?: string;
  notes?: string;
}

export interface Note {
  id: string;
  userId: string;
  at: string;
  text: string;
  pinned: boolean;
}

export interface Case {
  id: string;
  dealNo: string; // 取引番号
  workNo?: string; // 工事番号
  title: string;
  customerId: string;
  siteId: string;
  equipmentType: EquipmentType;
  stage: Stage;
  status: CaseStatus;
  lostReason?: string;
  salesRepId: string;
  engineerId?: string;
  inquiryDate: string;
  inquiryChannel: string;
  desiredDeliveryDate?: string;
  budget?: number;
  expectedAmount: number;
  probability: "A" | "B" | "C";
  description: string;
  specs: Spec;
  costEstimate: CostBreakdown;
  costCheckedBy?: string;
  costCheckedAt?: string;
  actualCost?: CostBreakdown;
  review: DealReview;
  order?: OrderInfo;
  workNoIssuedAt?: string;
  bom: BomItem[];
  processes: ProcessStep[];
  shipment: Shipment;
  sourceEquipmentId?: string; // 改造・更新案件の元装置
  sourceServiceId?: string;
  referenceCaseIds: string[];
  notes: Note[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = "draft" | "pending" | "approved" | "submitted" | "accepted" | "declined";

export interface QuoteItem {
  id: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
  unitCost: number;
}

export interface Quote {
  id: string;
  caseId: string;
  quoteNo: string; // 見積番号
  revision: number;
  issueDate: string;
  validUntil: string;
  status: QuoteStatus;
  subject: string;
  deliveryTerms: string;
  deliveryPlace: string;
  paymentTerms: string;
  items: QuoteItem[];
  discount: number;
  notes: string;
  createdBy: string;
  approvals: ApprovalStep[];
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  contact: string;
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface Part {
  id: string;
  partNo: string;
  name: string;
  spec: string;
  category: string;
  maker: string;
  unit: string;
  standardCost: number;
  supplierId?: string;
  leadTimeDays: number;
  procurement: Procurement;
}

export interface BomTemplateItem {
  key: string;
  parentKey: string | null;
  partNo: string;
  name: string;
  spec: string;
  material: string;
  maker: string;
  qty: number;
  unit: string;
  unitCost: number;
  procurement: Procurement;
  supplierId?: string;
  leadTimeDays?: number;
}

export interface BomTemplate {
  id: string;
  name: string;
  equipmentType?: EquipmentType;
  description: string;
  items: BomTemplateItem[];
  createdAt: string;
}

export type POStatus = "requested" | "ordered" | "partial" | "received" | "cancelled";

export interface POLine {
  id: string;
  bomItemId?: string;
  partNo: string;
  name: string;
  spec: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  poNo: string;
  caseId: string;
  supplierId: string;
  issueDate: string;
  dueDate: string;
  status: POStatus;
  lines: POLine[];
  notes: string;
  createdBy: string;
  receivedDate?: string;
}

export type EquipmentStatus = "running" | "repair" | "stopped" | "retired";

export interface Equipment {
  id: string;
  serialNo: string; // 製造番号
  name: string;
  model: string;
  equipmentType: EquipmentType;
  caseId: string;
  workNo: string;
  customerId: string;
  siteId: string;
  location: string;
  deliveredDate: string;
  warrantyUntil: string;
  status: EquipmentStatus;
  specs: Spec;
  notes: string;
}

export type ServiceType = "repair" | "modification" | "parts" | "inspection" | "inquiry";
export type ServiceStatus = "received" | "in_progress" | "waiting_parts" | "done";
export type Billing = "paid" | "free" | "warranty";

export interface ServicePart {
  id: string;
  partNo: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface ServiceRecord {
  id: string;
  ticketNo: string;
  equipmentId: string;
  type: ServiceType;
  title: string;
  description: string;
  cause: string;
  action: string;
  reportedDate: string;
  dueDate?: string;
  completedDate?: string;
  status: ServiceStatus;
  assigneeId: string;
  billing: Billing;
  parts: ServicePart[];
  laborHours: number;
  amount: number;
  linkedCaseId?: string;
  reporter: string;
  createdAt: string;
}

export type DocKind =
  | "quote"
  | "spec"
  | "drawing"
  | "minutes"
  | "order"
  | "inspection"
  | "manual"
  | "photo"
  | "purchase"
  | "report"
  | "other";

export type FileType = "pdf" | "xlsx" | "docx" | "dwg" | "jpg" | "gdoc" | "gsheet" | "zip";

export interface DocFile {
  id: string;
  caseId?: string;
  equipmentId?: string;
  serviceId?: string;
  folder: string;
  name: string;
  kind: DocKind;
  fileType: FileType;
  size: number;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export type ActivityEntity = "case" | "quote" | "customer" | "equipment" | "service" | "po" | "bom" | "doc" | "master";

export interface Activity {
  id: string;
  at: string;
  userId: string;
  entity: ActivityEntity;
  entityId: string;
  caseId?: string;
  message: string;
}

export interface AppNotification {
  id: string;
  at: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  tone: "info" | "success" | "warning" | "danger";
}

export interface CompanySettings {
  companyName: string;
  postalCode: string;
  address: string;
  phone: string;
  fax: string;
  representative: string;
  invoiceNo: string;
  bankInfo: string;
  quoteValidDays: number;
  taxRate: number;
  warrantyMonths: number;
}

export interface Counters {
  deal: Record<string, number>;
  work: Record<string, number>;
  po: Record<string, number>;
  service: Record<string, number>;
  customer: number;
  part: number;
}

export interface DB {
  initialized: boolean;
  seedVersion: number;
  settings: CompanySettings;
  users: User[];
  customers: Customer[];
  sites: Site[];
  suppliers: Supplier[];
  parts: Part[];
  bomTemplates: BomTemplate[];
  cases: Case[];
  quotes: Quote[];
  purchaseOrders: PurchaseOrder[];
  equipment: Equipment[];
  services: ServiceRecord[];
  documents: DocFile[];
  activities: Activity[];
  notifications: AppNotification[];
  counters: Counters;
}
