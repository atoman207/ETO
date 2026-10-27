"use client";

import { forwardRef, useEffect, useState } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/format";

const base =
  "w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 transition-[border-color,box-shadow] duration-150 hover:border-stone-400 focus:border-ai-500 focus:outline-none focus:ring-3 focus:ring-ai-500/15 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500";

export function Field({
  label,
  required,
  hint,
  children,
  className,
  error,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-stone-600">
        {label}
        {required && <span className="rounded-sm bg-rose-600 px-1 text-[10px] leading-4 text-white">必須</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : hint ? <span className="mt-1 block text-[11px] text-stone-500">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(base, "py-2 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        base,
        "h-9 appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_10px_center] bg-no-repeat pr-8",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

/** 3桁区切りで表示する数値入力 */
export function NumberInput({
  value,
  onChange,
  className,
  suffix,
  disabled,
  min,
  placeholder,
  compact,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  className?: string;
  suffix?: string;
  disabled?: boolean;
  min?: number;
  placeholder?: string;
  compact?: boolean;
}) {
  const fmt = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? "" : v.toLocaleString("ja-JP"));
  const [text, setText] = useState(fmt(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(fmt(value));
  }, [value, focused]);
  return (
    <div className={cn("relative", className)}>
      <input
        inputMode="decimal"
        disabled={disabled}
        placeholder={placeholder}
        className={cn(compact ? "cell-input text-right font-num" : cn(base, "h-9 text-right font-num"), suffix && (compact ? "pr-6" : "pr-9"))}
        value={text}
        onFocus={() => {
          setFocused(true);
          setText(value === undefined || Number.isNaN(value) ? "" : String(value));
        }}
        onBlur={() => {
          setFocused(false);
          const n = Number(
            text
              .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
              .replace(/[,，¥￥\s]/g, ""),
          );
          const v = Number.isFinite(n) ? (min !== undefined ? Math.max(min, n) : n) : 0;
          onChange(v);
          setText(fmt(v));
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {suffix && <span className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs text-stone-400", compact ? "right-1.5" : "right-3")}>{suffix}</span>}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex cursor-pointer select-none items-center gap-2 text-sm", disabled && "cursor-not-allowed opacity-60")}>
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer rounded border-stone-300 accent-ai-700"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "xs";
}) {
  return (
    <div className="inline-flex rounded-md bg-stone-100 p-0.5 ring-1 ring-inset ring-stone-200">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-3 font-medium transition-all",
            size === "sm" ? "h-7 text-xs" : "h-6 text-[11px]",
            value === o.value ? "bg-white text-ai-800 shadow-sm" : "text-stone-500 hover:text-stone-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
