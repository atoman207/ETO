"use client";

import { Plus, Trash2 } from "lucide-react";
import { CONTROLS, ENVIRONMENTS, MATERIALS, OPTION_PRESETS, POWERS } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { Spec } from "@/lib/types";
import { Field, Input, NumberInput, Select, Textarea } from "@/components/ui/form";
import { IconButton } from "@/components/ui/button";

function withCustom(list: string[], value: string) {
  return value && !list.includes(value) ? [...list, value] : list;
}

export function SpecEditor({ value, onChange, disabled }: { value: Spec; onChange: (s: Spec) => void; disabled?: boolean }) {
  const set = <K extends keyof Spec>(k: K, v: Spec[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="処理能力" className="sm:col-span-1">
          <NumberInput value={value.capacity} onChange={(v) => set("capacity", v)} suffix={value.capacityUnit} disabled={disabled} min={0} />
        </Field>
        <Field label="外形寸法 W（mm）">
          <NumberInput value={value.width} onChange={(v) => set("width", v)} disabled={disabled} min={0} />
        </Field>
        <Field label="D（mm）">
          <NumberInput value={value.depth} onChange={(v) => set("depth", v)} disabled={disabled} min={0} />
        </Field>
        <Field label="H（mm）">
          <NumberInput value={value.height} onChange={(v) => set("height", v)} disabled={disabled} min={0} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="主要材質">
          <Select value={value.material} onChange={(e) => set("material", e.target.value)} disabled={disabled}>
            {withCustom(MATERIALS, value.material).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="制御方式">
          <Select value={value.control} onChange={(e) => set("control", e.target.value)} disabled={disabled}>
            {withCustom(CONTROLS, value.control).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="電源">
          <Select value={value.power} onChange={(e) => set("power", e.target.value)} disabled={disabled}>
            {withCustom(POWERS, value.power).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
        <Field label="設置環境">
          <Select value={value.environment} onChange={(e) => set("environment", e.target.value)} disabled={disabled}>
            {withCustom(ENVIRONMENTS, value.environment).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="対象ワーク・搬送物" hint="例：自動車用ブラケット（最大5kg）">
        <Input value={value.workpiece} onChange={(e) => set("workpiece", e.target.value)} disabled={disabled} placeholder="対象となるワークの名称・材質・サイズ・重量など" />
      </Field>
      <Field label="オプション">
        <div className="flex flex-wrap gap-1.5">
          {withCustom(OPTION_PRESETS, "").concat(value.options.filter((o) => !OPTION_PRESETS.includes(o))).map((o) => {
            const on = value.options.includes(o);
            return (
              <button
                key={o}
                type="button"
                disabled={disabled}
                onClick={() => set("options", on ? value.options.filter((x) => x !== o) : [...value.options, o])}
                className={cn(
                  "rounded-full px-3 py-1 text-xs ring-1 ring-inset transition-all",
                  on ? "bg-ai-700 text-white ring-ai-700" : "bg-white text-stone-600 ring-stone-300 hover:ring-ai-400",
                  disabled && "cursor-default opacity-80",
                )}
              >
                {on ? "✓ " : ""}
                {o}
              </button>
            );
          })}
        </div>
      </Field>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-stone-600">個別仕様項目（装置ごとの固有パラメータ）</span>
          {!disabled && (
            <button type="button" onClick={() => set("customFields", [...value.customFields, { label: "", value: "" }])} className="inline-flex items-center gap-1 text-xs text-ai-700 hover:underline">
              <Plus size={13} />
              項目を追加
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {value.customFields.length === 0 && <div className="rounded-md border border-dashed border-stone-300 px-3 py-3 text-center text-xs text-stone-400">例：洗浄液、槽構成、タクトタイム、検査項目、設計圧力 など</div>}
          {value.customFields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={f.label}
                placeholder="項目名"
                disabled={disabled}
                className="w-44"
                onChange={(e) => set("customFields", value.customFields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <Input
                value={f.value}
                placeholder="内容"
                disabled={disabled}
                onChange={(e) => set("customFields", value.customFields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
              />
              {!disabled && (
                <IconButton label="削除" onClick={() => set("customFields", value.customFields.filter((_, j) => j !== i))}>
                  <Trash2 size={15} />
                </IconButton>
              )}
            </div>
          ))}
        </div>
      </div>
      <Field label="特記事項">
        <Textarea rows={2} value={value.notes} onChange={(e) => set("notes", e.target.value)} disabled={disabled} placeholder="規格・法令対応、客先標準、立会検査の要否など" />
      </Field>
    </div>
  );
}
