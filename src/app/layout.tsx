import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource/shippori-mincho/600.css";
import "@fontsource/shippori-mincho/700.css";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "匠帳｜個別受注生産 案件・装置統合管理",
    template: "%s｜匠帳",
  },
  description: "引合から納品・アフターサービスまで、案件と装置の情報を一気通貫で管理する個別受注生産（ETO）向け業務システムのデモ版です。",
};

export const viewport: Viewport = {
  themeColor: "#132c40",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" data-motion="full" data-follow-os="false" data-texture="none" data-density="standard" data-sidebar="deep" suppressHydrationWarning>
      <head>
        {/* 保存済みのテーマを初回描画前に適用（ちらつき防止） */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            offset={{ top: 68, right: 20 }}
            richColors
            closeButton
            toastOptions={{ className: "toast-wa", style: { fontFamily: "var(--font-sans)", fontSize: "0.8125rem" } }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
