import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Activity,
  ActivityEntity,
  AppNotification,
  BomItem,
  BomTemplate,
  Case,
  CaseStatus,
  CompanySettings,
  Contact,
  CostBreakdown,
  Customer,
  DB,
  DealReview,
  DocFile,
  Equipment,
  OrderInfo,
  Part,
  ProcessStep,
  PurchaseOrder,
  POStatus,
  Quote,
  ServicePart,
  ServiceRecord,
  Site,
  Spec,
  Stage,
  Supplier,
} from "./types";
import { createSeed, SEED_VERSION } from "./seed";
import { addDays, bomDescendants, costTotal, diffDays, nowIso, today, uid, yy } from "./format";
import { DEFAULT_PROCESSES, EQUIPMENT_TYPES, REVIEW_CHECK_ITEMS, STAGE_INDEX, stageDef } from "./constants";
import { cloneSubtrees, instantiateTemplate, subtreeToTemplateItems, type ParsedBomRow } from "./bom";

const pad = (n: number, len: number) => String(n).padStart(len, "0");

export const emptyCost = (): CostBreakdown => ({ design: 0, material: 0, purchased: 0, machining: 0, assembly: 0, testing: 0, transport: 0, overhead: 0 });

export const emptySpec = (unit = ""): Spec => ({
  capacity: 0,
  capacityUnit: unit,
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
});

const emptyReview = (): DealReview => ({
  status: "none",
  checks: REVIEW_CHECK_ITEMS.map((label) => ({ label, ok: null })),
  riskNotes: "",
  approvals: [],
});

const approvalSteps = () =>
  (["担当", "課長", "部長"] as const).map((label, i) => ({ label, level: i as 0 | 1 | 2, status: "waiting" as const }));

/** 受注日〜納期から標準工程を計画 */
export function planProcesses(orderDate: string, deliveryDate: string, engineerId?: string): ProcessStep[] {
  const t = today();
  const start = diffDays(orderDate, t) + 3;
  const end = diffDays(deliveryDate, t) - 8;
  const span = Math.max(30, end - start);
  let cursor = start;
  const assignees = [engineerId, "u06", "u07", "u07", "u07", "u07", engineerId, "u07", "u07"];
  return DEFAULT_PROCESSES.map((p, i) => {
    const len = Math.max(2, Math.round(span * p.weight));
    const s = i === 1 ? cursor - Math.round(len * 0.4) : cursor;
    const e = s + len;
    cursor = e;
    const doing = s <= 0 && e >= 0;
    return {
      id: uid("pr"),
      name: p.name,
      startDate: addDays(t, s),
      endDate: addDays(t, e),
      progress: doing ? 5 : 0,
      status: doing ? "doing" : "todo",
      assigneeId: assignees[i],
    };
  });
}

export interface NewCaseInput {
  title: string;
  customerId: string;
  siteId: string;
  equipmentType: Case["equipmentType"];
  salesRepId: string;
  engineerId?: string;
  inquiryDate: string;
  inquiryChannel: string;
  desiredDeliveryDate?: string;
  budget?: number;
  expectedAmount: number;
  probability: Case["probability"];
  description: string;
  specs: Spec;
  tags: string[];
  referenceCaseIds: string[];
  costEstimate?: CostBreakdown;
  sourceEquipmentId?: string;
  sourceServiceId?: string;
}

interface Actions {
  setCurrentUser: (id: string) => void;
  resetDemo: () => void;
  updateSettings: (patch: Partial<CompanySettings>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  addCustomer: (c: Omit<Customer, "id" | "code" | "createdAt">, site: Omit<Site, "id" | "customerId" | "contacts">, contact?: Omit<Contact, "id">) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addSite: (customerId: string, site: Omit<Site, "id" | "customerId" | "contacts">) => string;
  updateSite: (id: string, patch: Partial<Site>) => void;
  addContact: (siteId: string, contact: Omit<Contact, "id">) => void;
  removeContact: (siteId: string, contactId: string) => void;

  createCase: (input: NewCaseInput) => string;
  updateCase: (id: string, patch: Partial<Case>, message?: string) => void;
  setStage: (id: string, stage: Stage) => void;
  setCaseStatus: (id: string, status: CaseStatus, reason?: string) => void;
  confirmCost: (id: string, cost: CostBreakdown) => void;
  addNote: (caseId: string, text: string) => void;
  toggleNotePin: (caseId: string, noteId: string) => void;
  deleteNote: (caseId: string, noteId: string) => void;

  createQuote: (caseId: string, baseQuoteId?: string) => string;
  updateQuote: (id: string, patch: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  requestQuoteApproval: (id: string) => void;
  approveQuote: (id: string, comment?: string) => void;
  rejectQuote: (id: string, comment: string) => void;
  submitQuote: (id: string) => void;
  setQuoteStatus: (id: string, status: Quote["status"]) => void;

  updateReview: (caseId: string, patch: Partial<DealReview>) => void;
  requestReview: (caseId: string) => void;
  approveReview: (caseId: string, comment?: string) => void;
  rejectReview: (caseId: string, comment: string) => void;

  registerOrder: (caseId: string, order: OrderInfo, issueWorkNo: boolean, quoteId?: string) => string | undefined;
  issueWorkNo: (caseId: string) => string;

  addBomItem: (caseId: string, item: Partial<BomItem>, parentId: string | null) => string;
  updateBomItem: (caseId: string, itemId: string, patch: Partial<BomItem>) => void;
  deleteBomItem: (caseId: string, itemId: string) => void;
  moveBomItem: (caseId: string, itemId: string, dir: -1 | 1) => void;
  insertTemplate: (caseId: string, templateId: string) => number;
  copyBomFromCase: (caseId: string, sourceCaseId: string, rootIds: string[]) => number;
  importBomRows: (caseId: string, rows: ParsedBomRow[], assemblyName: string) => number;
  addPartsToBom: (caseId: string, parentId: string | null, entries: { part: Part; qty: number }[]) => void;
  saveAsTemplate: (caseId: string, rootId: string, name: string, description: string) => string;

  createPurchaseRequests: (caseId: string) => { created: number; skipped: number };
  updatePOStatus: (poId: string, status: POStatus) => void;
  deletePO: (poId: string) => void;

  updateProcess: (caseId: string, processId: string, patch: Partial<ProcessStep>) => void;
  updateShipment: (caseId: string, patch: Partial<Case["shipment"]>) => void;
  completeDelivery: (caseId: string, deliveredDate: string, location: string) => string[];

  updateEquipment: (id: string, patch: Partial<Equipment>) => void;

  createService: (input: Omit<ServiceRecord, "id" | "ticketNo" | "createdAt" | "parts" | "status"> & { parts?: ServicePart[] }) => string;
  updateService: (id: string, patch: Partial<ServiceRecord>) => void;
  convertServiceToCase: (serviceId: string) => string;

  addDocument: (doc: Omit<DocFile, "id" | "updatedAt" | "updatedBy" | "version" | "size"> & { size?: number }) => void;
  deleteDocument: (id: string) => void;

  addPart: (p: Omit<Part, "id">) => void;
  updatePart: (id: string, patch: Partial<Part>) => void;
  deletePart: (id: string) => void;
  addSupplier: (s: Omit<Supplier, "id" | "code">) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteTemplate: (id: string) => void;
}

export type Store = DB & { currentUserId: string; lastReset?: string } & Actions;

const emptyDB = (): DB => ({
  initialized: false,
  seedVersion: 0,
  settings: {
    companyName: "",
    postalCode: "",
    address: "",
    phone: "",
    fax: "",
    representative: "",
    invoiceNo: "",
    bankInfo: "",
    quoteValidDays: 60,
    taxRate: 0.1,
    warrantyMonths: 12,
  },
  users: [],
  customers: [],
  sites: [],
  suppliers: [],
  parts: [],
  bomTemplates: [],
  cases: [],
  quotes: [],
  purchaseOrders: [],
  equipment: [],
  services: [],
  documents: [],
  activities: [],
  notifications: [],
  counters: { deal: {}, work: {}, po: {}, service: {}, customer: 0, part: 0 },
});

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const me = () => get().currentUserId;
      const activity = (entity: ActivityEntity, entityId: string, message: string, caseId?: string): Activity => ({
        id: uid("ac"),
        at: nowIso(),
        userId: me(),
        entity,
        entityId,
        caseId,
        message,
      });
      const log = (entity: ActivityEntity, entityId: string, message: string, caseId?: string) =>
        set((s) => ({ activities: [activity(entity, entityId, message, caseId), ...s.activities].slice(0, 2000) }));
      const notify = (n: Omit<AppNotification, "id" | "at" | "read">) =>
        set((s) => ({ notifications: [{ ...n, id: uid("nf"), at: nowIso(), read: false }, ...s.notifications].slice(0, 100) }));
      const patchCase = (id: string, fn: (c: Case) => Partial<Case>) =>
        set((s) => ({ cases: s.cases.map((c) => (c.id === id ? { ...c, ...fn(c), updatedAt: nowIso() } : c)) }));
      const getCase = (id: string) => get().cases.find((c) => c.id === id);
      const addDocs = (docs: Omit<DocFile, "id" | "updatedAt" | "updatedBy" | "version" | "size">[]) =>
        set((s) => ({
          documents: [
            ...docs.map((d) => ({ ...d, id: uid("doc"), updatedAt: nowIso(), updatedBy: me(), version: 1, size: Math.round(80 + Math.random() * 900) * 1024 })),
            ...s.documents,
          ],
        }));
      const userLevel = () => get().users.find((u) => u.id === me())?.approvalLevel ?? 0;

      return {
        ...emptyDB(),
        currentUserId: "u11",

        setCurrentUser: (id) => set({ currentUserId: id }),
        resetDemo: () => set({ ...createSeed(), currentUserId: get().currentUserId, lastReset: nowIso() }),
        updateSettings: (patch) => {
          set((s) => ({ settings: { ...s.settings, ...patch } }));
          log("master", "settings", "自社情報・設定を更新しました");
        },
        markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

        // ───── 顧客 ─────
        addCustomer: (c, site, contact) => {
          const n = get().counters.customer + 1;
          const id = uid("cu");
          const siteId = uid("si");
          set((s) => ({
            customers: [...s.customers, { ...c, id, code: `C-${pad(n, 4)}`, createdAt: nowIso() }],
            sites: [...s.sites, { ...site, id: siteId, customerId: id, contacts: contact ? [{ ...contact, id: uid("ct") }] : [] }],
            counters: { ...s.counters, customer: n },
          }));
          log("customer", id, `顧客「${c.name}」を登録しました`);
          return id;
        },
        updateCustomer: (id, patch) => {
          set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
          log("customer", id, "顧客情報を更新しました");
        },
        addSite: (customerId, site) => {
          const id = uid("si");
          set((s) => ({ sites: [...s.sites, { ...site, id, customerId, contacts: [] }] }));
          log("customer", customerId, `拠点「${site.name}」を追加しました`);
          return id;
        },
        updateSite: (id, patch) => set((s) => ({ sites: s.sites.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
        addContact: (siteId, contact) =>
          set((s) => ({ sites: s.sites.map((x) => (x.id === siteId ? { ...x, contacts: [...x.contacts, { ...contact, id: uid("ct") }] } : x)) })),
        removeContact: (siteId, contactId) =>
          set((s) => ({ sites: s.sites.map((x) => (x.id === siteId ? { ...x, contacts: x.contacts.filter((c) => c.id !== contactId) } : x)) })),

        // ───── 案件 ─────
        createCase: (input) => {
          const y = yy(input.inquiryDate);
          const n = (get().counters.deal[y] ?? 0) + 1;
          const dealNo = `T${y}-${pad(n, 4)}`;
          const id = uid("cs");
          const c: Case = {
            id,
            dealNo,
            title: input.title,
            customerId: input.customerId,
            siteId: input.siteId,
            equipmentType: input.equipmentType,
            stage: "inquiry",
            status: "active",
            salesRepId: input.salesRepId,
            engineerId: input.engineerId,
            inquiryDate: input.inquiryDate,
            inquiryChannel: input.inquiryChannel,
            desiredDeliveryDate: input.desiredDeliveryDate,
            budget: input.budget,
            expectedAmount: input.expectedAmount,
            probability: input.probability,
            description: input.description,
            specs: input.specs,
            costEstimate: input.costEstimate ?? emptyCost(),
            review: emptyReview(),
            bom: [],
            processes: [],
            shipment: {},
            sourceEquipmentId: input.sourceEquipmentId,
            sourceServiceId: input.sourceServiceId,
            referenceCaseIds: input.referenceCaseIds,
            notes: [],
            tags: input.tags,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
          set((s) => ({ cases: [c, ...s.cases], counters: { ...s.counters, deal: { ...s.counters.deal, [y]: n } } }));
          addDocs([
            { caseId: id, folder: "01_引合・見積", name: `引合メモ_${input.title}`, kind: "minutes", fileType: "gdoc" },
          ]);
          log("case", id, `引合を登録しました（${dealNo}）`, id);
          return id;
        },
        updateCase: (id, patch, message) => {
          patchCase(id, () => patch);
          if (message) log("case", id, message, id);
        },
        setStage: (id, stage) => {
          patchCase(id, () => ({ stage }));
          log("case", id, `ステージを「${stageDef(stage).label}」に更新しました`, id);
        },
        setCaseStatus: (id, status, reason) => {
          patchCase(id, () => ({ status, lostReason: status === "lost" ? reason : undefined }));
          const label = { active: "進行中に戻しました", onhold: "保留にしました", lost: "失注として登録しました", completed: "完了にしました" }[status];
          log("case", id, `案件を${label}${reason ? `（${reason}）` : ""}`, id);
        },
        confirmCost: (id, cost) => {
          patchCase(id, (c) => ({
            costEstimate: cost,
            costCheckedBy: me(),
            costCheckedAt: nowIso(),
            stage: STAGE_INDEX[c.stage] < STAGE_INDEX.quotation ? "quotation" : c.stage,
          }));
          log("case", id, `概算原価を確認しました（見積原価 ¥${costTotal(cost).toLocaleString()}）`, id);
        },
        addNote: (caseId, text) => {
          patchCase(caseId, (c) => ({ notes: [{ id: uid("nt"), userId: me(), at: nowIso(), text, pinned: false }, ...c.notes] }));
          log("case", caseId, "引継ぎメモを追加しました", caseId);
        },
        toggleNotePin: (caseId, noteId) => patchCase(caseId, (c) => ({ notes: c.notes.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n)) })),
        deleteNote: (caseId, noteId) => patchCase(caseId, (c) => ({ notes: c.notes.filter((n) => n.id !== noteId) })),

        // ───── 見積 ─────
        createQuote: (caseId, baseQuoteId) => {
          const c = getCase(caseId)!;
          const caseQuotes = get().quotes.filter((q) => q.caseId === caseId);
          const rev = caseQuotes.reduce((m, q) => Math.max(m, q.revision), 0) + 1;
          const base = baseQuoteId ? caseQuotes.find((q) => q.id === baseQuoteId) : caseQuotes.sort((a, b) => b.revision - a.revision)[0];
          const st = get().settings;
          const site = get().sites.find((x) => x.id === c.siteId);
          const cust = get().customers.find((x) => x.id === c.customerId);
          const t = today();
          const ce = c.costEstimate;
          const total = costTotal(ce);
          const target = c.expectedAmount || Math.round(total / 0.72 / 10000) * 10000;
          const qty = 1;
          const id = uid("qt");
          const q: Quote = base
            ? {
                ...base,
                id,
                revision: rev,
                quoteNo: `${c.dealNo.replace(/^T/, "M")}-${pad(rev, 2)}`,
                issueDate: t,
                validUntil: addDays(t, st.quoteValidDays),
                status: "draft",
                items: base.items.map((i) => ({ ...i, id: uid("qi") })),
                approvals: approvalSteps(),
                createdBy: me(),
                createdAt: nowIso(),
              }
            : {
                id,
                caseId,
                quoteNo: `${c.dealNo.replace(/^T/, "M")}-${pad(rev, 2)}`,
                revision: rev,
                issueDate: t,
                validUntil: addDays(t, st.quoteValidDays),
                status: "draft",
                subject: c.title,
                deliveryTerms: "ご発注後 6ヶ月",
                deliveryPlace: `貴社 ${site?.name ?? ""}`,
                paymentTerms: cust?.paymentTerms ?? "別途協議",
                items: [
                  { id: uid("qi"), name: `${c.title} 本体`, spec: `${EQUIPMENT_TYPES[c.equipmentType].label}／処理能力 ${c.specs.capacity.toLocaleString()}${c.specs.capacityUnit}`, qty, unit: "台", unitPrice: Math.round((target * 0.68) / 10000) * 10000, unitCost: ce.design + ce.material + ce.purchased + ce.machining },
                  { id: uid("qi"), name: "制御盤・電気配線工事", spec: c.specs.control, qty: 1, unit: "式", unitPrice: Math.round((target * 0.16) / 10000) * 10000, unitCost: ce.assembly },
                  { id: uid("qi"), name: "据付・試運転調整", spec: `${site?.name ?? ""}にて`, qty: 1, unit: "式", unitPrice: Math.round((target * 0.1) / 10000) * 10000, unitCost: ce.testing + ce.overhead },
                  { id: uid("qi"), name: "取扱説明書・完成図書", spec: "紙2部＋電子データ", qty: 1, unit: "式", unitPrice: Math.round((target * 0.02) / 10000) * 10000, unitCost: 0 },
                  { id: uid("qi"), name: "輸送費", spec: "トラック輸送（チャーター便）", qty: 1, unit: "式", unitPrice: Math.round((target * 0.04) / 10000) * 10000, unitCost: ce.transport },
                ],
                discount: 0,
                notes: "・本見積には消費税は含まれておりません。\n・据付時の電源・エア元配管は貴社ご支給とさせていただきます。\n・仕様変更が生じた場合は、別途お見積りさせていただきます。",
                createdBy: me(),
                approvals: approvalSteps(),
                createdAt: nowIso(),
              };
          set((s) => ({ quotes: [...s.quotes, q] }));
          if (STAGE_INDEX[c.stage] < STAGE_INDEX.quotation) patchCase(caseId, () => ({ stage: "quotation" }));
          log("quote", id, `見積書 ${q.quoteNo} を作成しました${base ? `（${base.quoteNo} から改訂）` : ""}`, caseId);
          return id;
        },
        updateQuote: (id, patch) => set((s) => ({ quotes: s.quotes.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
        deleteQuote: (id) => {
          const q = get().quotes.find((x) => x.id === id);
          set((s) => ({ quotes: s.quotes.filter((x) => x.id !== id) }));
          if (q) log("quote", id, `見積書 ${q.quoteNo} を削除しました`, q.caseId);
        },
        requestQuoteApproval: (id) => {
          const q = get().quotes.find((x) => x.id === id)!;
          set((s) => ({
            quotes: s.quotes.map((x) =>
              x.id === id
                ? { ...x, status: "pending", approvals: x.approvals.map((a, i) => (i === 0 ? { ...a, status: "approved", userId: me(), at: nowIso() } : { ...a, status: "waiting", userId: undefined, at: undefined, comment: undefined })) }
                : x,
            ),
          }));
          log("quote", id, `見積書 ${q.quoteNo} の承認を申請しました`, q.caseId);
          notify({ title: "見積承認の依頼", body: `${q.quoteNo} ${q.subject}：課長承認待ち`, href: `/cases/${q.caseId}?tab=quote`, tone: "warning" });
        },
        approveQuote: (id, comment) => {
          const q = get().quotes.find((x) => x.id === id)!;
          const idx = q.approvals.findIndex((a) => a.status === "waiting");
          if (idx < 0) return;
          const approvals = q.approvals.map((a, i) => (i === idx ? { ...a, status: "approved" as const, userId: me(), at: nowIso(), comment } : a));
          const done = approvals.every((a) => a.status === "approved");
          set((s) => ({ quotes: s.quotes.map((x) => (x.id === id ? { ...x, approvals, status: done ? "approved" : "pending" } : x)) }));
          log("quote", id, `見積書 ${q.quoteNo} を承認しました（${q.approvals[idx].label}）`, q.caseId);
          if (done) notify({ title: "見積が承認されました", body: `${q.quoteNo} ${q.subject}：客先へ提出できます`, href: `/cases/${q.caseId}?tab=quote`, tone: "success" });
        },
        rejectQuote: (id, comment) => {
          const q = get().quotes.find((x) => x.id === id)!;
          const idx = q.approvals.findIndex((a) => a.status === "waiting");
          set((s) => ({
            quotes: s.quotes.map((x) =>
              x.id === id ? { ...x, status: "draft", approvals: x.approvals.map((a, i) => (i === idx ? { ...a, status: "rejected", userId: me(), at: nowIso(), comment } : a)) } : x,
            ),
          }));
          log("quote", id, `見積書 ${q.quoteNo} を差戻しました：${comment}`, q.caseId);
          notify({ title: "見積が差戻されました", body: `${q.quoteNo}：${comment}`, href: `/cases/${q.caseId}?tab=quote`, tone: "danger" });
        },
        submitQuote: (id) => {
          const q = get().quotes.find((x) => x.id === id)!;
          set((s) => ({ quotes: s.quotes.map((x) => (x.id === id ? { ...x, status: "submitted", issueDate: today() } : x)) }));
          addDocs([{ caseId: q.caseId, folder: "01_引合・見積", name: `御見積書_${q.quoteNo}.pdf`, kind: "quote", fileType: "pdf" }]);
          log("quote", id, `見積書 ${q.quoteNo} を客先へ提出しました`, q.caseId);
        },
        setQuoteStatus: (id, status) => set((s) => ({ quotes: s.quotes.map((x) => (x.id === id ? { ...x, status } : x)) })),

        // ───── 取引審査 ─────
        updateReview: (caseId, patch) => patchCase(caseId, (c) => ({ review: { ...c.review, ...patch } })),
        requestReview: (caseId) => {
          patchCase(caseId, (c) => ({
            stage: STAGE_INDEX[c.stage] < STAGE_INDEX.review ? "review" : c.stage,
            review: {
              ...c.review,
              status: "pending",
              requestedAt: nowIso(),
              requestedBy: me(),
              approvals: approvalSteps().map((a, i) => (i === 0 ? { ...a, status: "approved", userId: me(), at: nowIso() } : a)),
            },
          }));
          const c = getCase(caseId)!;
          addDocs([{ caseId, folder: "01_引合・見積", name: `取引審査票_${c.dealNo}`, kind: "report", fileType: "gsheet" }]);
          log("case", caseId, "取引審査を申請しました", caseId);
          notify({ title: "取引審査の承認依頼", body: `${c.dealNo} ${c.title}：課長承認待ち`, href: `/cases/${caseId}?tab=review`, tone: "warning" });
        },
        approveReview: (caseId, comment) => {
          const c = getCase(caseId)!;
          const idx = c.review.approvals.findIndex((a) => a.status === "waiting");
          if (idx < 0) return;
          const approvals = c.review.approvals.map((a, i) => (i === idx ? { ...a, status: "approved" as const, userId: me(), at: nowIso(), comment } : a));
          const done = approvals.every((a) => a.status === "approved");
          patchCase(caseId, (x) => ({ review: { ...x.review, approvals, status: done ? "approved" : "pending" } }));
          log("case", caseId, done ? "取引審査が承認されました" : `取引審査を承認しました（${c.review.approvals[idx].label}）`, caseId);
          if (done) notify({ title: "取引審査が承認されました", body: `${c.dealNo} ${c.title}：受注登録へ進めます`, href: `/cases/${caseId}?tab=review`, tone: "success" });
        },
        rejectReview: (caseId, comment) => {
          const c = getCase(caseId)!;
          const idx = c.review.approvals.findIndex((a) => a.status === "waiting");
          patchCase(caseId, (x) => ({
            review: { ...x.review, status: "rejected", approvals: x.review.approvals.map((a, i) => (i === idx ? { ...a, status: "rejected", userId: me(), at: nowIso(), comment } : a)) },
          }));
          log("case", caseId, `取引審査を差戻しました：${comment}`, caseId);
        },

        // ───── 受注・工番 ─────
        registerOrder: (caseId, order, issue, quoteId) => {
          patchCase(caseId, () => ({ order, expectedAmount: order.orderAmount, stage: "ordered", desiredDeliveryDate: order.deliveryDate }));
          if (quoteId) set((s) => ({ quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, status: "accepted" } : q)) }));
          const c = getCase(caseId)!;
          const cust = get().customers.find((x) => x.id === c.customerId);
          addDocs([{ caseId, folder: "01_引合・見積", name: `注文書_${cust?.name ?? ""}_${order.customerPoNo}.pdf`, kind: "order", fileType: "pdf" }]);
          log("case", caseId, `受注を登録しました（受注金額 ¥${order.orderAmount.toLocaleString()}）`, caseId);
          if (issue) return get().issueWorkNo(caseId);
          return undefined;
        },
        issueWorkNo: (caseId) => {
          const c = getCase(caseId)!;
          if (c.workNo) return c.workNo;
          const t = today();
          const y = yy(t);
          const n = (get().counters.work[y] ?? 100) + 1;
          const workNo = `K${y}-${pad(n, 3)}`;
          const processes = c.order ? planProcesses(c.order.orderDate, c.order.deliveryDate, c.engineerId) : [];
          set((s) => ({ counters: { ...s.counters, work: { ...s.counters.work, [y]: n } } }));
          patchCase(caseId, () => ({ workNo, workNoIssuedAt: nowIso(), stage: "design", processes }));
          addDocs([{ caseId, folder: "01_引合・見積", name: `社内注文書_${workNo}.pdf`, kind: "order", fileType: "pdf" }]);
          log("case", caseId, `工事番号 ${workNo} を発行しました`, caseId);
          notify({ title: "工事番号を発行しました", body: `${workNo} ${c.title}：設計・手配を開始してください`, href: `/cases/${caseId}?tab=bom`, tone: "success" });
          return workNo;
        },

        // ───── BOM ─────
        addBomItem: (caseId, item, parentId) => {
          const id = uid("bom");
          patchCase(caseId, (c) => {
            const siblings = c.bom.filter((b) => b.parentId === parentId);
            const row: BomItem = {
              id,
              parentId,
              partNo: "",
              name: "",
              spec: "",
              material: "",
              maker: "",
              qty: 1,
              unit: "個",
              unitCost: 0,
              procurement: "buy",
              note: "",
              sortOrder: siblings.reduce((m, b) => Math.max(m, b.sortOrder), -1) + 1,
              ...item,
            };
            return { bom: [...c.bom, row] };
          });
          return id;
        },
        updateBomItem: (caseId, itemId, patch) => patchCase(caseId, (c) => ({ bom: c.bom.map((b) => (b.id === itemId ? { ...b, ...patch } : b)) })),
        deleteBomItem: (caseId, itemId) => {
          patchCase(caseId, (c) => {
            const remove = new Set([itemId, ...bomDescendants(c.bom, itemId)]);
            return { bom: c.bom.filter((b) => !remove.has(b.id)) };
          });
        },
        moveBomItem: (caseId, itemId, dir) =>
          patchCase(caseId, (c) => {
            const item = c.bom.find((b) => b.id === itemId);
            if (!item) return {};
            const siblings = c.bom.filter((b) => b.parentId === item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
            const idx = siblings.findIndex((b) => b.id === itemId);
            const swap = siblings[idx + dir];
            if (!swap) return {};
            const order = siblings.map((s) => s.id);
            order[idx] = swap.id;
            order[idx + dir] = item.id;
            const pos = new Map(order.map((id, i) => [id, i]));
            return { bom: c.bom.map((b) => (pos.has(b.id) ? { ...b, sortOrder: pos.get(b.id)! } : b)) };
          }),
        insertTemplate: (caseId, templateId) => {
          const tpl = get().bomTemplates.find((t) => t.id === templateId);
          if (!tpl) return 0;
          const c = getCase(caseId)!;
          const start = c.bom.filter((b) => !b.parentId).length;
          const items = instantiateTemplate(tpl, start);
          patchCase(caseId, (x) => ({ bom: [...x.bom, ...items] }));
          log("bom", caseId, `標準モジュール「${tpl.name}」をBOMに展開しました（${items.length - 1}品目）`, caseId);
          return items.length;
        },
        copyBomFromCase: (caseId, sourceCaseId, rootIds) => {
          const src = getCase(sourceCaseId);
          const c = getCase(caseId);
          if (!src || !c) return 0;
          const start = c.bom.filter((b) => !b.parentId).length;
          const items = cloneSubtrees(src.bom, rootIds, start);
          patchCase(caseId, (x) => ({ bom: [...x.bom, ...items], referenceCaseIds: Array.from(new Set([...x.referenceCaseIds, sourceCaseId])) }));
          log("bom", caseId, `類似案件 ${src.workNo ?? src.dealNo} からBOMを流用しました（${items.length}行）`, caseId);
          return items.length;
        },
        importBomRows: (caseId, rows, assemblyName) => {
          const c = getCase(caseId)!;
          const rootId = uid("bom");
          const start = c.bom.filter((b) => !b.parentId).length;
          const root: BomItem = { id: rootId, parentId: null, partNo: "", name: assemblyName, spec: "取込データ", material: "", maker: "自社", qty: 1, unit: "式", unitCost: 0, procurement: "make", note: "", sortOrder: start };
          const items: BomItem[] = rows.map((r, i) => ({
            id: uid("bom"),
            parentId: rootId,
            partNo: r.partNo,
            name: r.name,
            spec: r.spec,
            material: "",
            maker: r.maker,
            qty: r.qty,
            unit: r.unit,
            unitCost: r.unitCost,
            procurement: r.procurement,
            supplierId: r.matchedPart?.supplierId,
            leadTimeDays: r.matchedPart?.leadTimeDays,
            note: r.matchedPart ? "" : "品目マスタ未登録",
            sortOrder: i,
          }));
          patchCase(caseId, (x) => ({ bom: [...x.bom, root, ...items] }));
          log("bom", caseId, `Excel/CSVからBOMを取込みました（${items.length}品目）`, caseId);
          return items.length;
        },
        addPartsToBom: (caseId, parentId, entries) => {
          patchCase(caseId, (c) => {
            let sort = c.bom.filter((b) => b.parentId === parentId).reduce((m, b) => Math.max(m, b.sortOrder), -1);
            const rows: BomItem[] = entries.map(({ part, qty }) => ({
              id: uid("bom"),
              parentId,
              partNo: part.partNo,
              name: part.name,
              spec: part.spec,
              material: part.category === "材料" ? part.name.split(" ")[0] : "",
              maker: part.maker,
              qty,
              unit: part.unit,
              unitCost: part.standardCost,
              procurement: part.procurement,
              supplierId: part.supplierId,
              leadTimeDays: part.leadTimeDays,
              note: "",
              sortOrder: ++sort,
            }));
            return { bom: [...c.bom, ...rows] };
          });
          log("bom", caseId, `品目マスタから${entries.length}品目を追加しました`, caseId);
        },
        saveAsTemplate: (caseId, rootId, name, description) => {
          const c = getCase(caseId)!;
          const items = subtreeToTemplateItems(c.bom, rootId);
          const id = uid("tp");
          const tpl: BomTemplate = { id, name, description, equipmentType: c.equipmentType, items, createdAt: nowIso() };
          set((s) => ({ bomTemplates: [...s.bomTemplates, tpl] }));
          log("master", id, `標準モジュール「${name}」を登録しました（${c.workNo ?? c.dealNo} より）`, caseId);
          return id;
        },

        // ───── 購買 ─────
        createPurchaseRequests: (caseId) => {
          const c = getCase(caseId)!;
          const parentIds = new Set(c.bom.map((b) => b.parentId).filter(Boolean));
          const leaves = c.bom.filter((b) => !parentIds.has(b.id) && b.procurement === "buy" && !b.poId);
          const withSup = leaves.filter((l) => l.supplierId);
          const groups = new Map<string, BomItem[]>();
          withSup.forEach((l) => groups.set(l.supplierId!, [...(groups.get(l.supplierId!) ?? []), l]));
          const t = today();
          const y = yy(t);
          let n = get().counters.po[y] ?? 0;
          const qty = c.order?.quantity ?? 1;
          const newPos: PurchaseOrder[] = [];
          const bomPo = new Map<string, string>();
          groups.forEach((lines, supplierId) => {
            n += 1;
            const id = uid("po");
            const lt = Math.max(...lines.map((l) => l.leadTimeDays ?? 14));
            newPos.push({
              id,
              poNo: `P${y}-${pad(n, 4)}`,
              caseId,
              supplierId,
              issueDate: t,
              dueDate: addDays(t, lt),
              status: "requested",
              lines: lines.map((l) => ({ id: uid("pl"), bomItemId: l.id, partNo: l.partNo, name: l.name, spec: l.spec, qty: l.qty * qty, unit: l.unit, unitPrice: l.unitCost })),
              notes: "",
              createdBy: me(),
            });
            lines.forEach((l) => bomPo.set(l.id, id));
          });
          if (newPos.length === 0) return { created: 0, skipped: leaves.length };
          set((s) => ({ purchaseOrders: [...s.purchaseOrders, ...newPos], counters: { ...s.counters, po: { ...s.counters.po, [y]: n } } }));
          patchCase(caseId, (x) => ({
            bom: x.bom.map((b) => (bomPo.has(b.id) ? { ...b, poId: bomPo.get(b.id) } : b)),
            stage: STAGE_INDEX[x.stage] < STAGE_INDEX.procurement ? "procurement" : x.stage,
          }));
          log("po", caseId, `BOMから購買依頼を${newPos.length}件作成しました（${withSup.length}品目）`, caseId);
          return { created: newPos.length, skipped: leaves.length - withSup.length };
        },
        updatePOStatus: (poId, status) => {
          const po = get().purchaseOrders.find((p) => p.id === poId)!;
          set((s) => ({
            purchaseOrders: s.purchaseOrders.map((p) =>
              p.id === poId ? { ...p, status, issueDate: status === "ordered" && p.status === "requested" ? today() : p.issueDate, receivedDate: status === "received" ? today() : p.receivedDate } : p,
            ),
          }));
          const label = { requested: "購買依頼に戻しました", ordered: "発注しました", partial: "一部入荷を登録しました", received: "入荷を登録しました", cancelled: "取消しました" }[status];
          const sup = get().suppliers.find((x) => x.id === po.supplierId);
          log("po", poId, `発注書 ${po.poNo}（${sup?.name ?? ""}）：${label}`, po.caseId);
        },
        deletePO: (poId) => {
          const po = get().purchaseOrders.find((p) => p.id === poId);
          if (!po) return;
          set((s) => ({ purchaseOrders: s.purchaseOrders.filter((p) => p.id !== poId) }));
          patchCase(po.caseId, (c) => ({ bom: c.bom.map((b) => (b.poId === poId ? { ...b, poId: undefined } : b)) }));
          log("po", poId, `購買依頼 ${po.poNo} を削除しました`, po.caseId);
        },

        // ───── 製造・出荷 ─────
        updateProcess: (caseId, processId, patch) => {
          patchCase(caseId, (c) => {
            const processes = c.processes.map((p) => {
              if (p.id !== processId) return p;
              const next = { ...p, ...patch };
              if (patch.progress !== undefined) {
                if (patch.progress >= 100) next.status = "done";
                else if (patch.progress > 0 && next.status !== "delayed") next.status = "doing";
                else if (patch.progress === 0 && next.status !== "delayed") next.status = "todo";
              }
              if (patch.status === "done") next.progress = 100;
              return next;
            });
            const started = processes.some((p) => p.name !== "詳細設計" && p.name !== "部品手配" && p.progress > 0);
            const stage = started && STAGE_INDEX[c.stage] < STAGE_INDEX.manufacturing ? "manufacturing" : c.stage;
            return { processes, stage };
          });
          const c = getCase(caseId)!;
          const p = c.processes.find((x) => x.id === processId);
          if (p && (patch.progress !== undefined || patch.status)) log("case", caseId, `工程「${p.name}」を更新しました（進捗 ${p.progress}%）`, caseId);
        },
        updateShipment: (caseId, patch) => {
          patchCase(caseId, (c) => ({ shipment: { ...c.shipment, ...patch }, stage: STAGE_INDEX[c.stage] < STAGE_INDEX.delivery ? "delivery" : c.stage }));
          log("case", caseId, "出荷・納品情報を更新しました", caseId);
        },
        completeDelivery: (caseId, deliveredDate, location) => {
          const c = getCase(caseId)!;
          const st = get().settings;
          const qty = c.order?.quantity ?? 1;
          const ids: string[] = [];
          const eqs: Equipment[] = Array.from({ length: qty }, (_, i) => {
            const id = uid("eq");
            ids.push(id);
            return {
              id,
              serialNo: `${c.workNo}-${pad(i + 1, 2)}`,
              name: qty > 1 ? `${c.title}（${i + 1}号機）` : c.title,
              model: `${EQUIPMENT_TYPES[c.equipmentType].label.slice(0, 2)}-${(c.workNo ?? "").replace("K", "")}`,
              equipmentType: c.equipmentType,
              caseId,
              workNo: c.workNo ?? "",
              customerId: c.customerId,
              siteId: c.siteId,
              location,
              deliveredDate,
              warrantyUntil: addDays(deliveredDate, Math.round(st.warrantyMonths * 30.4)),
              status: "running",
              specs: c.specs,
              notes: "",
            };
          });
          const parentIds = new Set(c.bom.map((b) => b.parentId).filter(Boolean));
          const bomCost = c.bom.filter((b) => !parentIds.has(b.id)).reduce((s, b) => s + b.unitCost * b.qty, 0) * qty;
          const est = c.costEstimate;
          const mp = est.material + est.purchased || 1;
          const actualCost: CostBreakdown = bomCost
            ? { ...est, material: Math.round((bomCost * est.material) / mp), purchased: Math.round((bomCost * est.purchased) / mp) }
            : { ...est };
          set((s) => ({ equipment: [...s.equipment, ...eqs] }));
          patchCase(caseId, (x) => ({
            stage: "aftercare",
            status: "completed",
            actualCost,
            shipment: { ...x.shipment, deliveredDate, shippedDate: x.shipment.shippedDate ?? deliveredDate },
            processes: x.processes.map((p) => ({ ...p, progress: 100, status: "done" })),
          }));
          addDocs([{ caseId, folder: "06_出荷・納品", name: `納品書_${c.workNo}.pdf`, kind: "order", fileType: "pdf" }]);
          log("case", caseId, `納品が完了し、装置台帳に登録しました（${eqs.map((e) => e.serialNo).join("、")}）`, caseId);
          notify({ title: "装置台帳に登録しました", body: `${eqs[0]?.serialNo} ${c.title}`, href: `/equipment/${ids[0]}`, tone: "success" });
          return ids;
        },

        updateEquipment: (id, patch) => {
          set((s) => ({ equipment: s.equipment.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
          const eq = get().equipment.find((e) => e.id === id);
          log("equipment", id, `装置情報を更新しました（${eq?.serialNo}）`, eq?.caseId);
        },

        // ───── アフターサービス ─────
        createService: (input) => {
          const y = yy(input.reportedDate);
          const n = (get().counters.service[y] ?? 0) + 1;
          const ticketNo = `S${y}-${pad(n, 4)}`;
          const id = uid("sv");
          const rec: ServiceRecord = { ...input, parts: input.parts ?? [], id, ticketNo, status: "received", createdAt: nowIso() };
          set((s) => ({ services: [rec, ...s.services], counters: { ...s.counters, service: { ...s.counters.service, [y]: n } } }));
          const eq = get().equipment.find((e) => e.id === input.equipmentId);
          if (eq && input.type === "repair") get().updateEquipment(eq.id, { status: "repair" });
          log("service", id, `サービス受付 ${ticketNo}：${input.title}`, eq?.caseId);
          notify({ title: "サービス受付", body: `${ticketNo} ${input.title}`, href: `/service/${id}`, tone: "info" });
          return id;
        },
        updateService: (id, patch) => {
          const before = get().services.find((s) => s.id === id)!;
          set((s) => ({ services: s.services.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
          const eq = get().equipment.find((e) => e.id === before.equipmentId);
          if (patch.status === "done" && before.status !== "done") {
            if (eq && eq.status === "repair") {
              const otherOpen = get().services.some((x) => x.id !== id && x.equipmentId === eq.id && x.status !== "done" && x.type === "repair");
              if (!otherOpen) set((s) => ({ equipment: s.equipment.map((e) => (e.id === eq.id ? { ...e, status: "running" } : e)) }));
            }
            addDocs([{ caseId: eq?.caseId, equipmentId: eq?.id, serviceId: id, folder: "07_アフターサービス", name: `サービス報告書_${before.ticketNo}.pdf`, kind: "report", fileType: "pdf" }]);
            log("service", id, `サービス ${before.ticketNo} の対応が完了しました`, eq?.caseId);
          } else {
            log("service", id, `サービス ${before.ticketNo} を更新しました`, eq?.caseId);
          }
        },
        convertServiceToCase: (serviceId) => {
          const sv = get().services.find((s) => s.id === serviceId)!;
          const eq = get().equipment.find((e) => e.id === sv.equipmentId)!;
          const src = getCase(eq.caseId);
          const cust = get().customers.find((c) => c.id === eq.customerId);
          const caseId = get().createCase({
            title: `${eq.name} 改造（${sv.title.replace(/の相談$/, "")}）`,
            customerId: eq.customerId,
            siteId: eq.siteId,
            equipmentType: eq.equipmentType,
            salesRepId: cust?.salesRepId ?? me(),
            engineerId: src?.engineerId,
            inquiryDate: today(),
            inquiryChannel: "既存顧客（リピート）",
            expectedAmount: 0,
            probability: "B",
            description: `【アフターサービス ${sv.ticketNo} より案件化】\n${sv.description}\n\n対象装置：${eq.serialNo} ${eq.name}（${eq.location}）`,
            specs: { ...eq.specs },
            tags: ["改造", "アフター起点"],
            referenceCaseIds: src ? [src.id] : [],
            sourceEquipmentId: eq.id,
            sourceServiceId: sv.id,
          });
          set((s) => ({ services: s.services.map((x) => (x.id === serviceId ? { ...x, linkedCaseId: caseId } : x)) }));
          log("service", serviceId, `サービス ${sv.ticketNo} を改造案件として登録しました`, caseId);
          return caseId;
        },

        // ───── 資料 ─────
        addDocument: (doc) => {
          set((s) => ({
            documents: [{ ...doc, id: uid("doc"), updatedAt: nowIso(), updatedBy: me(), version: 1, size: doc.size ?? Math.round(100 + Math.random() * 2000) * 1024 }, ...s.documents],
          }));
          log("doc", doc.caseId ?? "", `資料「${doc.name}」を登録しました`, doc.caseId);
        },
        deleteDocument: (id) => {
          const d = get().documents.find((x) => x.id === id);
          set((s) => ({ documents: s.documents.filter((x) => x.id !== id) }));
          if (d) log("doc", id, `資料「${d.name}」を削除しました`, d.caseId);
        },

        // ───── マスタ ─────
        addPart: (p) => {
          set((s) => ({ parts: [...s.parts, { ...p, id: uid("pt") }], counters: { ...s.counters, part: s.counters.part + 1 } }));
          log("master", p.partNo, `品目「${p.partNo} ${p.name}」を登録しました`);
        },
        updatePart: (id, patch) => set((s) => ({ parts: s.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        deletePart: (id) => set((s) => ({ parts: s.parts.filter((p) => p.id !== id) })),
        addSupplier: (sp) => {
          const n = get().suppliers.length + 101;
          set((s) => ({ suppliers: [...s.suppliers, { ...sp, id: uid("sp"), code: `V-${n}` }] }));
          log("master", sp.name, `仕入先「${sp.name}」を登録しました`);
        },
        updateSupplier: (id, patch) => set((s) => ({ suppliers: s.suppliers.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        deleteTemplate: (id) => set((s) => ({ bomTemplates: s.bomTemplates.filter((t) => t.id !== id) })),
      };
    },
    {
      name: "takumicho-demo",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ...data } = s;
        const out: Record<string, unknown> = {};
        Object.entries(data).forEach(([k, v]) => {
          if (typeof v !== "function") out[k] = v;
        });
        return out as Partial<Store>;
      },
    },
  ),
);

/** 初回起動時・データ版数変更時にデモデータを投入 */
export function ensureSeeded() {
  const s = useStore.getState();
  if (!s.initialized || s.seedVersion !== SEED_VERSION) {
    useStore.setState({ ...createSeed(), currentUserId: s.currentUserId || "u11" });
  }
}
