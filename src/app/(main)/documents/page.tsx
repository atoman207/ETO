"use client";

import { useMemo, useState } from "react";
import { FolderOpen, HardDrive, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLookups } from "@/lib/hooks";
import { matches } from "@/lib/format";
import { DOC_KINDS } from "@/lib/constants";
import type { DocKind } from "@/lib/types";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { DriveExplorer } from "@/components/docs/drive-explorer";

export default function DocumentsPage() {
  const documents = useStore((s) => s.documents);
  const cases = useStore((s) => s.cases);
  const lk = useLookups();
  const [caseId, setCaseId] = useState("all");
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const docs = useMemo(
    () => documents.filter((d) => (caseId === "all" || d.caseId === caseId) && (kind === "all" || d.kind === kind) && matches(q, d.name, lk.case.get(d.caseId ?? "")?.title, lk.case.get(d.caseId ?? "")?.workNo, lk.case.get(d.caseId ?? "")?.dealNo)),
    [documents, caseId, kind, q, lk],
  );
  const c = caseId !== "all" ? lk.case.get(caseId) : undefined;

  return (
    <div>
      <PageHeader title="資料管理（Google Drive 連携）" description="案件ごとの標準フォルダに資料を自動整理。番号・案件名・資料名で横断検索できます" icon={<FolderOpen size={20} />} breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "資料管理" }]} />
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <Card>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="relative w-full max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="資料名・工番・案件名で検索" className="pl-9" />
              </div>
              <Select value={caseId} onChange={(e) => setCaseId(e.target.value)} className="w-72">
                <option value="all">全案件</option>
                {[...cases].sort((a, b) => b.dealNo.localeCompare(a.dealNo)).map((x) => <option key={x.id} value={x.id}>{x.workNo ?? x.dealNo}　{x.title}</option>)}
              </Select>
              <Select value={kind} onChange={(e) => setKind(e.target.value)} className="w-40">
                <option value="all">全種類</option>
                {(Object.keys(DOC_KINDS) as DocKind[]).map((k) => <option key={k} value={k}>{DOC_KINDS[k]}</option>)}
              </Select>
              <span className="ml-auto text-xs text-stone-500"><span className="font-num font-bold text-stone-800">{docs.length}</span> 件</span>
            </div>
          </Card>
          <DriveExplorer docs={docs} path={c ? ["共有ドライブ「案件」", `${c.dealNo}_${c.title}`] : ["共有ドライブ「案件」", "全案件"]} caseId={c?.id} showCase={!c} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Drive とデータベースの役割分担" icon={<HardDrive size={16} />} />
            <CardBody className="space-y-3 text-xs leading-relaxed text-stone-600">
              <div>
                <div className="mb-1 font-bold text-ai-800">データベース（本システム）</div>
                顧客・案件・番号・仕様・原価・BOM・発注・装置・サービス履歴など、<b>検索・集計・紐付けが必要な構造化データ</b>を管理します。
              </div>
              <div>
                <div className="mb-1 font-bold text-shu-700">Google Drive</div>
                図面（CAD）・客先仕様書・議事録・写真・取扱説明書など、<b>ファイルそのもの</b>を保管します。共同編集やプレビューは Drive の機能をそのまま活用します。
              </div>
              <div className="rounded-md bg-stone-50 p-2.5">
                本システムは各ファイルの <b>ファイルID・フォルダ・種類・版数・更新者</b> を保持し、案件・装置・サービスと紐付けます。引合登録時に標準フォルダ（01〜07）を自動作成し、メンバーの権限も自動設定します。
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
