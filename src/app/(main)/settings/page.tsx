"use client";

import { useState } from "react";
import { Building, Check, Database, Download, Hash, Minus, Palette, RotateCcw, Save, Settings, ShieldCheck } from "lucide-react";
import { useThemeStore } from "@/components/theme/theme-provider";
import { fontByKey, PRESETS } from "@/lib/theme";
import { WaPattern } from "@/components/theme/wa-pattern";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan } from "@/lib/hooks";
import { yy, today } from "@/lib/format";
import { PERMISSION_LABELS, ROLES, ROLE_PERMISSIONS } from "@/lib/constants";
import type { CompanySettings, Permission, Role } from "@/lib/types";
import { PageHeader, LockedNotice } from "@/components/ui/misc";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const counters = useStore((s) => s.counters);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetDemo = useStore((s) => s.resetDemo);
  const canEdit = useCan("editMaster");
  const [f, setF] = useState<CompanySettings>(settings);
  const [confirm, setConfirm] = useState(false);
  const y = yy(today());

  const exportJson = () => {
    const s = useStore.getState();
    const data = Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function"));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `takumicho-data-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("全データをJSON形式で出力しました");
  };

  const roles = Object.keys(ROLES) as Role[];
  const perms = Object.keys(PERMISSION_LABELS) as Permission[];

  return (
    <div>
      <PageHeader title="設定・権限" description="自社情報・帳票設定・採番ルール・権限設計を管理します" icon={<Settings size={20} />} breadcrumbs={[{ label: "ホーム", href: "/" }, { label: "設定・権限" }]} />
      {!canEdit && <div className="mb-4"><LockedNotice message="設定の変更はシステム管理者のみ可能です（閲覧のみ）" /></div>}
      <div className="grid gap-4 xl:grid-cols-2">
        <ThemeCard />
        <Card>
          <CardHeader
            title="自社情報（帳票に印字されます）"
            icon={<Building size={16} />}
            actions={canEdit && <Button size="sm" variant="primary" icon={<Save size={13} />} onClick={() => { updateSettings(f); toast.success("設定を保存しました"); }}>保存</Button>}
          />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="会社名" className="sm:col-span-2"><Input value={f.companyName} disabled={!canEdit} onChange={(e) => setF({ ...f, companyName: e.target.value })} /></Field>
              <Field label="郵便番号"><Input value={f.postalCode} disabled={!canEdit} onChange={(e) => setF({ ...f, postalCode: e.target.value })} /></Field>
              <Field label="代表者"><Input value={f.representative} disabled={!canEdit} onChange={(e) => setF({ ...f, representative: e.target.value })} /></Field>
              <Field label="所在地" className="sm:col-span-2"><Input value={f.address} disabled={!canEdit} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
              <Field label="電話番号"><Input value={f.phone} disabled={!canEdit} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
              <Field label="FAX"><Input value={f.fax} disabled={!canEdit} onChange={(e) => setF({ ...f, fax: e.target.value })} /></Field>
              <Field label="適格請求書発行事業者登録番号" hint="インボイス制度対応（T＋13桁）" className="sm:col-span-2"><Input value={f.invoiceNo} disabled={!canEdit} onChange={(e) => setF({ ...f, invoiceNo: e.target.value })} /></Field>
              <Field label="振込先" className="sm:col-span-2"><Input value={f.bankInfo} disabled={!canEdit} onChange={(e) => setF({ ...f, bankInfo: e.target.value })} /></Field>
              <Field label="見積有効期間"><NumberInput value={f.quoteValidDays} disabled={!canEdit} onChange={(v) => setF({ ...f, quoteValidDays: v })} suffix="日" /></Field>
              <Field label="標準保証期間"><NumberInput value={f.warrantyMonths} disabled={!canEdit} onChange={(v) => setF({ ...f, warrantyMonths: v })} suffix="ヶ月" /></Field>
              <Field label="消費税率"><NumberInput value={Math.round(f.taxRate * 100)} disabled={!canEdit} onChange={(v) => setF({ ...f, taxRate: v / 100 })} suffix="%" /></Field>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="採番ルール" description="番号体系により、受注前〜納品後の情報を一本の線で紐付けます" icon={<Hash size={16} />} />
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>番号</th>
                    <th>形式</th>
                    <th>採番タイミング</th>
                    <th>次の番号</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["取引番号", "T{年2桁}-{連番4桁}", "引合登録時", `T${y}-${String((counters.deal[y] ?? 0) + 1).padStart(4, "0")}`],
                    ["見積番号", "M{取引番号の年・連番}-{版数2桁}", "見積作成・改訂時", "取引番号に連動"],
                    ["工事番号", "K{年2桁}-{連番3桁}", "受注・工番発行時", `K${y}-${String((counters.work[y] ?? 100) + 1).padStart(3, "0")}`],
                    ["製造番号", "{工事番号}-{号機2桁}", "納品完了時", "工事番号に連動"],
                    ["発注番号", "P{年2桁}-{連番4桁}", "購買依頼作成時", `P${y}-${String((counters.po[y] ?? 0) + 1).padStart(4, "0")}`],
                    ["サービス受付番号", "S{年2桁}-{連番4桁}", "サービス受付時", `S${y}-${String((counters.service[y] ?? 0) + 1).padStart(4, "0")}`],
                  ].map(([a, b, c, d]) => (
                    <tr key={a}>
                      <td className="font-medium">{a}</td>
                      <td className="font-num text-xs">{b}</td>
                      <td className="text-xs text-stone-600">{c}</td>
                      <td className="font-num text-xs font-bold text-ai-800">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card>
            <CardHeader title="デモデータの管理" icon={<Database size={16} />} />
            <CardBody className="space-y-3">
              <p className="text-xs leading-relaxed text-stone-600">本デモのデータはお使いのブラウザ内（ローカルストレージ）に保存されています。初期状態に戻したり、全データを出力したりできます。</p>
              <div className="flex flex-wrap gap-2">
                <Button icon={<Download size={14} />} onClick={exportJson}>全データを出力（JSON）</Button>
                <Button variant="danger" icon={<RotateCcw size={14} />} onClick={() => setConfirm(true)}>デモデータを初期化</Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card className="xl:col-span-2">
          <CardHeader title="ロール別の権限マトリクス" description="部署・役職ごとに、閲覧・操作できる範囲を制御します（右上のユーザー切替で動作を確認できます）" icon={<ShieldCheck size={16} />} />
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>権限</th>
                  {roles.map((r) => (
                    <th key={r} className="text-center">
                      <span className={`rounded-sm px-1.5 py-0.5 text-[0.6875rem] ${ROLES[r].color}`}>{ROLES[r].label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map((p) => (
                  <tr key={p}>
                    <td>
                      <div className="text-[0.8125rem] font-medium">{PERMISSION_LABELS[p].label}</div>
                      <div className="text-[0.6875rem] text-stone-500">{PERMISSION_LABELS[p].description}</div>
                    </td>
                    {roles.map((r) => (
                      <td key={r} className="text-center">
                        {ROLE_PERMISSIONS[r].includes(p) ? <Check size={16} className="mx-auto text-emerald-600" strokeWidth={3} /> : <Minus size={14} className="mx-auto text-stone-300" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardBody className="border-t border-stone-100 text-[0.6875rem] leading-relaxed text-stone-500">
            ※ 承認は役職による段階制です（担当 → 課長 → 部長・役員）。原価情報は「原価・粗利の閲覧」権限がない場合、画面・帳票・CSV のすべてでマスク表示されます。本番環境では Google Workspace の組織部門と連携し、退職・異動時の権限変更も自動化します。
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          resetDemo();
          setF(useStore.getState().settings);
          toast.success("デモデータを初期化しました");
        }}
        title="デモデータの初期化"
        message="登録・変更したデータはすべて破棄され、初期状態に戻ります。よろしいですか？"
        confirmLabel="初期化する"
        danger
      />
    </div>
  );
}

function ThemeCard() {
  const theme = useThemeStore((s) => s.theme);
  const setOpen = useThemeStore((s) => s.setPanelOpen);
  const preset = PRESETS.find((p) => p.id === theme.presetId);
  return (
    <Card className="relative overflow-hidden xl:col-span-2">
      <WaPattern className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 opacity-70 [mask-image:linear-gradient(to_left,black,transparent)]" id="wa-settings" fill="transparent" line="color-mix(in oklab, var(--color-ai-500) 12%, transparent)" />
      <CardBody className="relative flex flex-wrap items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ai-600 to-ai-800 text-white shadow-md">
          <Palette size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-[0.9375rem] font-bold text-stone-800">表示デザイン（配色・フォント・動き）</div>
          <p className="mt-0.5 text-xs text-stone-500">
            現在：<b className="text-stone-700">{preset ? `和の配色「${preset.name}」` : "カスタム配色"}</b>／本文 {fontByKey(theme.fontBody)?.label}／文字 {Math.round(theme.fontScale * 100)}%／動き {{ none: "なし", subtle: "控えめ", full: "軽やか" }[theme.motion]}
          </p>
          <div className="mt-2 flex gap-1">
            {["--color-ai-700", "--color-ai-400", "--color-ai-100", "--color-shu-500", "--color-shu-200", "--color-kinari", "--color-inshu"].map((v) => (
              <span key={v} className="h-5 w-5 rounded-full ring-2 ring-surface shadow-sm" style={{ background: `var(${v})` }} />
            ))}
          </div>
        </div>
        <Button variant="primary" icon={<Palette size={15} />} onClick={() => setOpen(true)}>
          表示デザインを変更
        </Button>
      </CardBody>
    </Card>
  );
}
