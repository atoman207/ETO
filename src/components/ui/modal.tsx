"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/format";
import { Button } from "./button";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  icon?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[6vh] sm:p-6 sm:pt-[8vh]">
          <motion.div
            className="fixed inset-0 bg-ai-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn("relative w-full rounded-xl bg-white shadow-2xl shadow-ai-950/20 ring-1 ring-stone-200", widths[size])}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
          >
            <div className="flex items-start gap-3 border-b border-stone-100 px-6 py-4">
              {icon && <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ai-50 text-ai-700">{icon}</div>}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-stone-800">{title}</h2>
                {description && <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{description}</p>}
              </div>
              <button onClick={onClose} className="-mr-2 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700" aria-label="閉じる">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 scroll-thin">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-stone-100 bg-stone-50/70 px-6 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "実行する",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-stone-600">{message}</div>
    </Modal>
  );
}
