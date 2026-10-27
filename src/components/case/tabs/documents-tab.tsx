"use client";

import { useMemo } from "react";
import { Printer, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { toDate } from "@/lib/format";
import type { CaseTabProps } from "../tab-types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DriveExplorer } from "@/components/docs/drive-explorer";

export function DocumentsTab({ c }: CaseTabProps) {
  const documents = useStore((s) => s.documents);
  const quotes = useStore((s) => s.quotes);
  const lk = useLookups();
  const docs = useMemo(() => documents.filter((d) => d.caseId === c.id), [documents, c.id]);
  const latest = quotes.filter((q) => q.caseId === c.id).sort((a, b) => b.revision - a.revision)[0];
  const cust = lk.customer.get(c.customerId);
  const short = cust?.name.replace(/株式会社|有限会社|\s/g, "") ?? "";
  const folderName = `${c.dealNo}_${short}_${c.title}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <DriveExplorer docs={docs} path={["共有ドライブ「案件」", String(toDate(c.inquiryDate).getFullYear()) + "年度", folderName]} caseId={c.id} />
      <div className="space-y-4">
        <Card>
          <CardHeader title="帳票の自動作成" description="案件データから作成するため、転記・再入力は不要です" icon={<Printer size={16} />} />
          <CardBody className="space-y-2">
            <Button className="w-full justify-start" icon={<Printer size={14} />} disabled={!latest} onClick={() => window.open(`/print/quote/${latest?.id}`, "_blank")}>
              御見積書{latest ? `（${latest.quoteNo}）` : "（未作成）"}
            </Button>
            <Button className="w-full justify-start" icon={<Printer size={14} />} onClick={() => window.open(`/print/spec/${c.id}`, "_blank")}>
              仕様書
            </Button>
            <Button className="w-full justify-start" icon={<Printer size={14} />} disabled={!c.workNo} onClick={() => window.open(`/print/order/${c.id}`, "_blank")}>
              社内注文書（工事指示書）
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="フォルダの共有設定" icon={<ShieldCheck size={16} />} />
          <CardBody className="space-y-2 text-[0.8125rem]">
            {[
              ["営業部（案件担当）", "編集者"],
              ["設計部", "編集者"],
              ["購買部", c.workNo ? "編集者（04_購買）" : "—"],
              ["製造部", c.workNo ? "閲覧者" : "—"],
              ["サービス課", "閲覧者（07のみ編集）"],
              ["社外ユーザー", "共有不可"],
            ].map(([who, perm]) => (
              <div key={who} className="flex justify-between gap-2">
                <span className="text-stone-600">{who}</span>
                <span className="text-right text-xs font-medium text-stone-800">{perm}</span>
              </div>
            ))}
            <p className="border-t border-stone-100 pt-2 text-[0.6875rem] leading-relaxed text-stone-500">ステージの進行に合わせて、Drive API により権限を自動付与します。原価計算書は「原価閲覧」権限を持つユーザーのみに共有されます。</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
