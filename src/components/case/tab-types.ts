import type { Case } from "@/lib/types";

export type CaseTab = "overview" | "spec" | "cost" | "quote" | "review" | "bom" | "purchase" | "production" | "shipment" | "after" | "docs" | "history";

export interface CaseTabProps {
  c: Case;
  goTab: (t: CaseTab) => void;
  openOrder: () => void;
  onWorkNo: (workNo: string) => void;
}
