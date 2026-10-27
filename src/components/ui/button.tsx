"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "success";
type Size = "xs" | "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-sheen bg-ai-700 text-white hover:bg-ai-800 shadow-sm shadow-ai-900/10 disabled:bg-ai-700/50",
  accent: "btn-sheen bg-shu-500 text-white hover:bg-shu-600 shadow-sm shadow-shu-700/20 disabled:bg-shu-500/50",
  secondary: "bg-surface text-stone-700 ring-1 ring-inset ring-stone-300 hover:bg-stone-50 hover:ring-stone-400 disabled:text-stone-400",
  ghost: "text-stone-600 hover:bg-stone-900/5 hover:text-stone-900 disabled:text-stone-400",
  danger: "bg-surface text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 disabled:text-rose-300",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:bg-emerald-600/50",
};

const SIZES: Record<Size, string> = {
  xs: "h-7 px-2 text-xs gap-1 rounded-sm",
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-md",
  lg: "h-11 px-6 text-[0.9375rem] gap-2 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});

export function IconButton({ className, label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-900/5 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
