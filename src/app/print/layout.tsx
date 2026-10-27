import { HydrationGate } from "@/components/layout/hydration-gate";

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <HydrationGate>{children}</HydrationGate>;
}
