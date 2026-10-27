"use client";

import Link from "next/link";
import { useState } from "react";
import { GitCompare, Pencil, Printer, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan } from "@/lib/hooks";
import { num } from "@/lib/format";
import type { CaseTabProps } from "../tab-types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DL } from "@/components/ui/misc";
import { SpecEditor } from "../spec-editor";

export function SpecTab({ c }: CaseTabProps) {
  const update = useStore((s) => s.updateCase);
  const canEditCase = useCan("editCase");
  const canEditBom = useCan("editBom");
  const canEdit = canEditCase || canEditBom;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.specs);
  const s = c.specs;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader
          title="装置仕様"
          description="仕様は見積書・仕様書・社内注文書・装置台帳へ自動で引き継がれます（二重入力不要）"
          actions={
            editing ? (
              <>
                <Button size="sm" icon={<X size={13} />} onClick={() => { setDraft(c.specs); setEditing(false); }}>
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Save size={13} />}
                  onClick={() => {
                    update(c.id, { specs: draft }, "仕様を更新しました");
                    setEditing(false);
                    toast.success("仕様を保存しました");
                  }}
                >
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" icon={<Printer size={13} />} onClick={() => window.open(`/print/spec/${c.id}`, "_blank")}>
                  仕様書を印刷
                </Button>
                {canEdit && (
                  <Button size="sm" variant="primary" icon={<Pencil size={13} />} onClick={() => { setDraft(c.specs); setEditing(true); }}>
                    編集
                  </Button>
                )}
              </>
            )
          }
        />
        <CardBody>
          {editing ? (
            <SpecEditor value={draft} onChange={setDraft} />
          ) : (
            <div className="space-y-5">
              <DL
                cols={4}
                items={[
                  { label: "処理能力", value: <span className="font-num text-[15px] font-bold">{num(s.capacity)} {s.capacityUnit}</span> },
                  { label: "外形寸法（W×D×H）", value: <span className="font-num">{num(s.width)} × {num(s.depth)} × {num(s.height)} mm</span> },
                  { label: "主要材質", value: s.material },
                  { label: "制御方式", value: s.control },
                  { label: "電源", value: s.power },
                  { label: "設置環境", value: s.environment },
                  { label: "対象ワーク", value: s.workpiece || "—", full: true },
                ]}
              />
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-stone-500">オプション</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.options.length === 0 && <span className="text-xs text-stone-400">なし</span>}
                  {s.options.map((o) => (
                    <span key={o} className="rounded-full bg-ai-50 px-2.5 py-0.5 text-xs text-ai-800 ring-1 ring-ai-200">{o}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-stone-500">個別仕様項目</div>
                {s.customFields.length === 0 ? (
                  <span className="text-xs text-stone-400">なし</span>
                ) : (
                  <table className="w-full overflow-hidden rounded border border-stone-200 text-[13px]">
                    <tbody>
                      {s.customFields.map((f, i) => (
                        <tr key={i} className="border-b border-stone-100 last:border-0">
                          <th className="w-48 bg-stone-50 px-3 py-2 text-left text-xs font-medium text-stone-600">{f.label}</th>
                          <td className="px-3 py-2">{f.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {s.notes && (
                <div>
                  <div className="mb-1 text-[11px] font-medium text-stone-500">特記事項</div>
                  <p className="whitespace-pre-wrap text-[13px]">{s.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="仕様データの活用" />
          <CardBody className="space-y-3 text-[13px] leading-relaxed text-stone-600">
            <p>ここで登録した仕様は構造化データとして保存され、以下に自動連携されます。</p>
            <ul className="space-y-1.5 text-xs">
              {["見積書の明細（処理能力・制御方式）", "仕様書・社内注文書（工事指示書）の印刷", "装置台帳（納品時に仕様をスナップショット保存）", "類似案件検索（能力・寸法・材質・環境で類似度判定）"].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-shu-500" />
                  {t}
                </li>
              ))}
            </ul>
            <Link href={`/search?case=${c.id}`}>
              <Button className="mt-2 w-full" icon={<GitCompare size={14} />}>
                この仕様で類似案件を検索
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
