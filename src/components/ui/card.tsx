import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/format";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-stone-200/90 bg-white shadow-[var(--shadow-card)]", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-3.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 text-ai-600">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-stone-800">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}
