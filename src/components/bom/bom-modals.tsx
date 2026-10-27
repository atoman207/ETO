"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, CheckCircle2, ClipboardPaste, Copy, PackagePlus, Search, TriangleAlert, Layers } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { bomChildren, bomRollup, cn, matches, yen } from "@/lib/format";
import { EQUIPMENT_TYPES } from "@/lib/constants";
import { similarity } from "@/lib/similarity";
import { parseBomText } from "@/lib/bom";
import type { Case, Part } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";

export function CopyFromCaseModal({ c, open, onClose }: { c: Case; open: boolean; onClose: () => void }) {
  const cases = useStore((s) => s.cases);
  const copy = useStore((s) => s.copyBomFromCase);
  const lk = useLookups();
  const showCost = useCan("viewCost");
  const [q, setQ] = useState("");
  const [src, setSrc] = useState<string>();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const candidates = useMemo(() => {
    const cust = lk.customer.get(c.customerId);
    return cases
      .filter((x) => x.id !== c.id && x.bom.length > 0)
      .map((x) => ({ x, ...similarity({ equipmentType: c.equipmentType, specs: c.specs, industry: cust?.industry }, x, lk.customer.get(x.customerId)) }))
      .filter(({ x }) => matches(q, x.title, x.workNo, lk.customer.get(x.customerId)?.name))
      .sort((a, b) => Number(c.referenceCaseIds.includes(b.x.id)) - Number(c.referenceCaseIds.includes(a.x.id)) || b.score - a.score);
  }, [cases, c, q, lk]);

  useEffect(() => {
    if (open) {
      setSrc(candidates[0]?.x.id);
      setQ("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const source = cases.find((x) => x.id === src);
  const roots = source ? bomChildren(source.bom, null) : [];
  useEffect(() => setChecked(new Set(roots.map((r) => r.id))), [src]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<Copy size={16} />}
      title="類似案件からBOMを流用"
      description="過去案件の部品表をユニット単位で選んでコピーします。コピー後に数量・単価を調整してください。"
      footer={
        <>
          <span className="mr-auto text-xs text-stone-500">{checked.size}ユニットを選択中</span>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            disabled={!source || checked.size === 0}
            onClick={() => {
              const n = copy(c.id, source!.id, roots.filter((r) => checked.has(r.id)).map((r) => r.id));
              toast.success(`${source!.workNo} から ${n}行をコピーしました`);
              onClose();
            }}
          >
            選択したユニットを流用
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="工番・案件名・顧客で検索" className="h-8 pl-8 text-xs" />
          </div>
          <div className="scroll-thin max-h-[52vh] space-y-1 overflow-y-auto pr-1">
            {candidates.map(({ x, score }) => (
              <button
                key={x.id}
                onClick={() => setSrc(x.id)}
                className={cn("w-full rounded-md border px-3 py-2 text-left transition-colors", src === x.id ? "border-ai-500 bg-ai-50" : "border-stone-200 hover:bg-stone-50")}
              >
                <div className="flex items-center justify-between">
                  <span className="font-num text-[0.6875rem] font-semibold text-shu-600">{x.workNo}</span>
                  <span className="font-num text-[0.625rem] text-stone-500">類似度 {score}</span>
                </div>
                <div className="text-[0.8125rem] font-medium leading-snug">{x.title}</div>
                <div className="flex items-center gap-1.5 text-[0.625rem] text-stone-500">
                  {EQUIPMENT_TYPES[x.equipmentType].label}・{x.bom.length}行
                  {c.referenceCaseIds.includes(x.id) && <Badge className="bg-ai-50 text-ai-700 ring-ai-200">参考案件</Badge>}
                </div>
              </button>
            ))}
            {candidates.length === 0 && <div className="py-8 text-center text-xs text-stone-500">BOMを持つ案件がありません</div>}
          </div>
        </div>
        <div className="rounded-md border border-stone-200">
          {source ? (
            <>
              <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-3 py-2">
                <span className="text-xs font-bold">{source.workNo} {source.title} のユニット構成</span>
                <div className="flex gap-2 text-[0.6875rem]">
                  <button className="text-ai-700 hover:underline" onClick={() => setChecked(new Set(roots.map((r) => r.id)))}>すべて選択</button>
                  <button className="text-ai-700 hover:underline" onClick={() => setChecked(new Set())}>選択解除</button>
                </div>
              </div>
              <div className="scroll-thin max-h-[48vh] overflow-y-auto">
                {roots.map((r) => {
                  const kids = bomChildren(source.bom, r.id);
                  return (
                    <div key={r.id} className="border-b border-stone-50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Checkbox
                          checked={checked.has(r.id)}
                          onChange={(v) => {
                            const n = new Set(checked);
                            if (v) n.add(r.id);
                            else n.delete(r.id);
                            setChecked(n);
                          }}
                          label={<span className="font-medium">{r.name}</span>}
                        />
                        <span className="font-num text-xs text-stone-500">
                          {kids.length}品目{showCost && `・${yen(bomRollup(source.bom, r.id))}`}
                        </span>
                      </div>
                      <div className="ml-6 mt-1 line-clamp-2 text-[0.6875rem] text-stone-500">{kids.map((k) => `${k.name}×${k.qty}`).join("、")}</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState title="左から流用元の案件を選択してください" />
          )}
        </div>
      </div>
    </Modal>
  );
}

export function TemplateModal({ c, open, onClose }: { c: Case; open: boolean; onClose: () => void }) {
  const templates = useStore((s) => s.bomTemplates);
  const insert = useStore((s) => s.insertTemplate);
  const showCost = useCan("viewCost");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"recommend" | "all">("recommend");
  useEffect(() => {
    if (open) setSel(new Set());
  }, [open]);
  const list = templates.filter((t) => filter === "all" || !t.equipmentType || t.equipmentType === c.equipmentType);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Layers size={16} />}
      title="標準モジュールを挿入"
      description="よく使うユニット構成をテンプレートとして登録しておき、ワンクリックで展開できます。"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            disabled={sel.size === 0}
            onClick={() => {
              let n = 0;
              list.filter((t) => sel.has(t.id)).forEach((t) => (n += insert(c.id, t.id)));
              toast.success(`${sel.size}モジュール（${n}行）を展開しました`);
              onClose();
            }}
          >
            {sel.size}件を挿入
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <Select value={filter} onChange={(e) => setFilter(e.target.value as "recommend" | "all")} className="h-8 w-60 text-xs">
          <option value="recommend">{EQUIPMENT_TYPES[c.equipmentType].label}向け＋共通モジュール</option>
          <option value="all">すべてのモジュール</option>
        </Select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((t) => {
          const on = sel.has(t.id);
          const total = t.items.filter((i) => i.parentKey).reduce((s, i) => s + i.qty * i.unitCost, 0);
          return (
            <button
              key={t.id}
              onClick={() => {
                const n = new Set(sel);
                if (on) n.delete(t.id);
                else n.add(t.id);
                setSel(n);
              }}
              className={cn("rounded-lg border p-3 text-left transition-all", on ? "border-ai-500 bg-ai-50 ring-2 ring-ai-500/15" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50")}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[0.8125rem] font-bold text-stone-800">{t.name}</span>
                {on && <CheckCircle2 size={16} className="shrink-0 text-ai-600" />}
              </div>
              <p className="mt-0.5 text-[0.6875rem] leading-relaxed text-stone-500">{t.description}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[0.6875rem] text-stone-600">
                <Badge>{t.equipmentType ? EQUIPMENT_TYPES[t.equipmentType].label : "共通"}</Badge>
                <span>{t.items.length - 1}品目</span>
                {showCost && <span className="font-num">標準原価 {yen(total)}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function PartPickerModal({ c, open, onClose }: { c: Case; open: boolean; onClose: () => void }) {
  const parts = useStore((s) => s.parts);
  const add = useStore((s) => s.addPartsToBom);
  const lk = useLookups();
  const showCost = useCan("viewCost");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [parent, setParent] = useState<string>("");
  const roots = bomChildren(c.bom, null);
  useEffect(() => {
    if (open) {
      setQty({});
      setParent(roots[roots.length - 1]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const cats = Array.from(new Set(parts.map((p) => p.category)));
  const list = parts.filter((p) => (cat === "all" || p.category === cat) && matches(q, p.partNo, p.name, p.spec, p.maker));
  const selected = Object.entries(qty).filter(([, v]) => v > 0);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<PackagePlus size={16} />}
      title="品目マスタから追加"
      description="数量を入力した品目がまとめて追加されます。単価・仕入先・リードタイムはマスタから自動設定されます。"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2 text-xs">
            追加先：
            <Select value={parent} onChange={(e) => setParent(e.target.value)} className="h-8 w-56 text-xs">
              <option value="">最上位（ユニットとして追加）</option>
              {roots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            disabled={selected.length === 0}
            onClick={() => {
              const entries = selected.map(([id, n]) => ({ part: parts.find((p) => p.id === id)!, qty: n }));
              add(c.id, parent || null, entries);
              toast.success(`${entries.length}品目を追加しました`);
              onClose();
            }}
          >
            {selected.length}品目を追加
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative w-72">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="品番・品名・型式・メーカー" className="h-8 pl-8 text-xs" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="h-8 w-40 text-xs">
          <option value="all">全分類</option>
          {cats.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </div>
      <div className="scroll-thin max-h-[50vh] overflow-auto rounded-md border border-stone-200">
        <table className="tbl tbl-compact">
          <thead>
            <tr>
              <th>品番</th>
              <th>品名</th>
              <th>型式・仕様</th>
              <th>メーカー</th>
              <th>分類</th>
              {showCost && <th className="text-right">標準単価</th>}
              <th>仕入先</th>
              <th className="text-right">LT</th>
              <th className="w-24 text-right">数量</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p: Part) => (
              <tr key={p.id} className={cn((qty[p.id] ?? 0) > 0 && "bg-ai-50/60")}>
                <td className="font-num text-xs font-medium">{p.partNo}</td>
                <td className="text-[0.8125rem]">{p.name}</td>
                <td className="text-xs text-stone-500">{p.spec}</td>
                <td className="text-xs">{p.maker}</td>
                <td>
                  <Badge>{p.category}</Badge>
                </td>
                {showCost && <td className="font-num text-right text-xs">{yen(p.standardCost)}</td>}
                <td className="text-[0.6875rem] text-stone-500">{p.supplierId ? lk.supplier.get(p.supplierId)?.name.replace(/株式会社|有限会社/g, "") : "社内"}</td>
                <td className="font-num text-right text-xs">{p.leadTimeDays}日</td>
                <td>
                  <NumberInput compact value={qty[p.id] ?? 0} onChange={(v) => setQty({ ...qty, [p.id]: Math.max(0, v) })} min={0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

const SAMPLE = `品番\t品名\t型式・仕様\tメーカー\t数量\t単位\t単価
E-1001\t\t\t\t1\t\t
E-1004\t\t\t\t1\t\t
S-2001\t\t\t\t6\t\t
P-5002\t\t\t\t8\t\t
X-9001\t専用治具プレート\tA5052 t20 図面No.J-0012\t自社\t2\t枚\t18000
X-9002\tワークガイド\tPOM 図面No.J-0013\t自社\t4\t個\t6500`;

export function ImportModal({ c, open, onClose }: { c: Case; open: boolean; onClose: () => void }) {
  const parts = useStore((s) => s.parts);
  const importRows = useStore((s) => s.importBomRows);
  const showCost = useCan("viewCost");
  const [text, setText] = useState("");
  const [name, setName] = useState("取込ユニット");
  useEffect(() => {
    if (open) {
      setText("");
      setName("取込ユニット");
    }
  }, [open]);
  const rows = useMemo(() => (text.trim() ? parseBomText(text, parts) : []), [text, parts]);
  const valid = rows.filter((r) => !r.error);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<ClipboardPaste size={16} />}
      title="Excel・CSV から取込"
      description="Excel の表をそのままコピー＆ペーストできます。品番が品目マスタに登録済みの場合、空欄の項目は自動で補完されます。"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            disabled={valid.length === 0 || !name.trim()}
            onClick={() => {
              const n = importRows(c.id, valid, name.trim());
              toast.success(`${n}品目を取込みました`);
              onClose();
            }}
          >
            {valid.length}品目を取込
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-stone-600">貼り付けエリア（列：品番／品名／型式・仕様／メーカー／数量／単位／単価）</span>
            <button className="text-xs text-ai-700 hover:underline" onClick={() => setText(SAMPLE)}>
              サンプルを入力
            </button>
          </div>
          <Textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" placeholder={"Excel で範囲を選択してコピーし、ここに貼り付けてください\n（CAD の部品表CSV出力にも対応）"} />
          <Field label="取込先ユニット名" className="mt-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-stone-600">
            プレビュー（{rows.length}行／マスタ一致 {rows.filter((r) => r.matchedPart).length}行）
          </div>
          <div className="scroll-thin max-h-[380px] overflow-auto rounded-md border border-stone-200">
            {rows.length === 0 ? (
              <EmptyState icon={<Boxes size={18} />} title="貼り付けると内容を確認できます" />
            ) : (
              <table className="tbl tbl-compact">
                <thead>
                  <tr>
                    <th />
                    <th>品番</th>
                    <th>品名</th>
                    <th className="text-right">数量</th>
                    {showCost && <th className="text-right">単価</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={r.error ? "bg-rose-50" : ""}>
                      <td>
                        {r.error ? (
                          <span title={r.error}>
                            <TriangleAlert size={14} className="text-rose-500" />
                          </span>
                        ) : r.matchedPart ? (
                          <span title="品目マスタと一致">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                          </span>
                        ) : (
                          <span title="品目マスタ未登録">
                            <TriangleAlert size={14} className="text-amber-500" />
                          </span>
                        )}
                      </td>
                      <td className="font-num text-xs">{r.partNo || "—"}</td>
                      <td className="text-xs">
                        {r.name || <span className="text-rose-600">{r.error}</span>}
                        {r.spec && <div className="text-[0.625rem] text-stone-400">{r.spec}</div>}
                      </td>
                      <td className="font-num text-right text-xs">
                        {r.qty} {r.unit}
                      </td>
                      {showCost && <td className="font-num text-right text-xs">{yen(r.unitCost)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[0.6875rem] text-stone-500">
            <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" />マスタ一致（自動補完）</span>
            <span className="flex items-center gap-1"><TriangleAlert size={12} className="text-amber-500" />マスタ未登録（そのまま取込）</span>
            <span className="flex items-center gap-1"><TriangleAlert size={12} className="text-rose-500" />エラー（取込対象外）</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function SaveTemplateModal({ c, rootId, onClose }: { c: Case; rootId: string | null; onClose: () => void }) {
  const save = useStore((s) => s.saveAsTemplate);
  const root = c.bom.find((b) => b.id === rootId);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  useEffect(() => {
    if (root) {
      setName(`${root.name}（${c.workNo ?? c.dealNo}標準）`);
      setDesc(`${c.title} で使用した構成`);
    }
  }, [root, c]);
  return (
    <Modal
      open={!!rootId}
      onClose={onClose}
      size="sm"
      title="標準モジュールとして登録"
      description="このユニット構成をテンプレート化し、他の案件で再利用できるようにします。"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant="primary"
            disabled={!name.trim()}
            onClick={() => {
              save(c.id, rootId!, name.trim(), desc);
              toast.success("標準モジュールを登録しました", { description: "マスタ管理 → BOMテンプレートで確認できます" });
              onClose();
            }}
          >
            登録する
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="モジュール名" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="説明">
          <Textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
