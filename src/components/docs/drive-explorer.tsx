"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, ExternalLink, Folder, FolderOpen, HardDrive, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useCan, useLookups } from "@/lib/hooks";
import { cn, fileSize, fmtDateTime } from "@/lib/format";
import { DOC_FOLDERS, DOC_KINDS } from "@/lib/constants";
import type { DocFile, DocKind, FileType } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button, IconButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, FileBadge } from "@/components/ui/misc";
import { ConfirmDialog } from "@/components/ui/modal";

function inferType(name: string): FileType {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["xls", "xlsx", "csv"].includes(ext)) return "xlsx";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["dwg", "dxf", "step", "stp", "igs"].includes(ext)) return "dwg";
  if (["jpg", "jpeg", "png", "heic", "gif"].includes(ext)) return "jpg";
  if (["zip", "7z", "lzh"].includes(ext)) return "zip";
  return "pdf";
}

function inferKind(folder: string, type: FileType): DocKind {
  if (type === "dwg") return "drawing";
  if (type === "jpg") return "photo";
  if (folder.startsWith("01")) return "quote";
  if (folder.startsWith("02")) return "spec";
  if (folder.startsWith("03")) return "drawing";
  if (folder.startsWith("04")) return "purchase";
  if (folder.startsWith("05")) return "inspection";
  if (folder.startsWith("06")) return "manual";
  if (folder.startsWith("07")) return "report";
  return "other";
}

export function DriveExplorer({ docs, path, caseId, equipmentId, extra, showCase }: { docs: DocFile[]; path: string[]; caseId?: string; equipmentId?: string; extra?: ReactNode; showCase?: boolean }) {
  const add = useStore((s) => s.addDocument);
  const del = useStore((s) => s.deleteDocument);
  const canEdit = useCan("editCase");
  const canBom = useCan("editBom");
  const canSvc = useCan("editService");
  const canAdd = (canEdit || canBom || canSvc) && !!caseId;
  const lk = useLookups();
  const [folder, setFolder] = useState<string>("all");
  const [drag, setDrag] = useState(false);
  const [delTarget, setDelTarget] = useState<DocFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const list = docs.filter((d) => folder === "all" || d.folder === folder).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const handleFiles = (files: FileList | null) => {
    if (!files || !caseId) return;
    const target = folder === "all" ? DOC_FOLDERS[1] : folder;
    Array.from(files).forEach((f) => {
      const ft = inferType(f.name);
      add({ caseId, equipmentId, folder: target, name: f.name, kind: inferKind(target, ft), fileType: ft, size: f.size });
    });
    toast.success(`${files.length}件の資料を「${target}」に登録しました`, { description: "デモ環境のためファイル本体は保存されず、資料情報のみ登録されます" });
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 bg-stone-50/70 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-stone-600">
          <HardDrive size={14} className="text-[#1a73e8]" />
          {path.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-stone-400" />}
              <span className={cn(i === path.length - 1 && "font-medium text-stone-800")}>{p}</span>
            </span>
          ))}
          {folder !== "all" && (
            <>
              <ChevronRight size={12} className="text-stone-400" />
              <span className="font-medium text-stone-800">{folder}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {extra}
          <Button size="sm" icon={<ExternalLink size={13} />} onClick={() => toast.info("Google Drive でフォルダを開きます", { description: "本番環境では Drive API 連携により、案件フォルダが直接開きます（デモ環境では接続していません）" })}>
            Drive で開く
          </Button>
          {canAdd && (
            <Button size="sm" variant="primary" icon={<UploadCloud size={13} />} onClick={() => inputRef.current?.click()}>
              資料を追加
            </Button>
          )}
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        </div>
      </div>
      <div className="grid md:grid-cols-[220px_1fr]">
        <div className="border-b border-stone-100 p-2 md:border-b-0 md:border-r">
          {[{ key: "all", label: "すべての資料" }, ...DOC_FOLDERS.map((f) => ({ key: f, label: f }))].map((f) => {
            const n = f.key === "all" ? docs.length : docs.filter((d) => d.folder === f.key).length;
            const active = folder === f.key;
            return (
              <button key={f.key} onClick={() => setFolder(f.key)} className={cn("flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors", active ? "bg-ai-50 font-medium text-ai-800" : "text-stone-600 hover:bg-stone-50")}>
                {active ? <FolderOpen size={15} className="text-amber-500" /> : <Folder size={15} className="text-amber-400" />}
                <span className="flex-1 truncate">{f.label}</span>
                <span className="font-num text-[10px] text-stone-400">{n}</span>
              </button>
            );
          })}
        </div>
        <div
          className={cn("relative min-h-[320px]", drag && "bg-ai-50/50")}
          onDragOver={(e) => {
            if (!canAdd) return;
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (canAdd) handleFiles(e.dataTransfer.files);
          }}
        >
          <AnimatePresence>
            {drag && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-3 z-10 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-ai-400 bg-white/80 text-ai-700">
                <UploadCloud size={30} />
                <div className="mt-2 text-sm font-medium">ここにドロップして「{folder === "all" ? DOC_FOLDERS[1] : folder}」に登録</div>
              </motion.div>
            )}
          </AnimatePresence>
          {list.length === 0 ? (
            <EmptyState icon={<Folder size={20} />} title="このフォルダに資料はありません" description={canAdd ? "ファイルをドラッグ＆ドロップするか「資料を追加」から登録できます" : undefined} />
          ) : (
            <div className="scroll-thin max-h-[560px] overflow-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>名前</th>
                    <th>種類</th>
                    {showCase && <th>案件</th>}
                    <th>版</th>
                    <th>最終更新</th>
                    <th className="text-right">サイズ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => {
                    const c = d.caseId ? lk.case.get(d.caseId) : undefined;
                    return (
                      <tr key={d.id} className="group">
                        <td>
                          <button className="flex items-center gap-2.5 text-left" onClick={() => toast.info(`「${d.name}」を開きます`, { description: "本番環境では Google Drive のプレビューが表示されます" })}>
                            <FileBadge type={d.fileType} />
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium text-stone-800 hover:text-ai-700 hover:underline">{d.name}</span>
                              {folder === "all" && <span className="block text-[10px] text-stone-400">{d.folder}</span>}
                            </span>
                          </button>
                        </td>
                        <td>
                          <Badge>{DOC_KINDS[d.kind]}</Badge>
                        </td>
                        {showCase && <td className="font-num whitespace-nowrap text-[11px] text-stone-500">{c ? c.workNo ?? c.dealNo : "—"}</td>}
                        <td className="font-num text-xs text-stone-500">v{d.version}</td>
                        <td className="whitespace-nowrap text-xs text-stone-600">
                          <span className="font-num">{fmtDateTime(d.updatedAt)}</span>
                          <span className="ml-1.5 text-stone-400">{lk.user.get(d.updatedBy)?.name}</span>
                        </td>
                        <td className="font-num text-right text-xs text-stone-500">{fileSize(d.size)}</td>
                        <td className="w-10">
                          {canAdd && (
                            <IconButton label="削除" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-rose-600" onClick={() => setDelTarget(d)}>
                              <Trash2 size={14} />
                            </IconButton>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={() => { if (delTarget) { del(delTarget.id); toast.success("資料を削除しました"); } }} title="資料の削除" message={`「${delTarget?.name}」を削除します。Google Drive 上ではゴミ箱に移動されます。`} confirmLabel="削除する" danger />
    </Card>
  );
}
