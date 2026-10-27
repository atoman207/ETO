import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-jp";
import "@fontsource/shippori-mincho/600.css";
import "@fontsource/shippori-mincho/700.css";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "匠帳｜個別受注生産 案件・装置統合管理",
    template: "%s｜匠帳",
  },
  description: "引合から納品・アフターサービスまで、案件と装置の情報を一気通貫で管理する個別受注生産（ETO）向け業務システムのデモ版です。",
};

export const viewport: Viewport = {
  themeColor: "#173a54",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <Toaster
          position="top-right"
          offset={{ top: 68, right: 20 }}
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: "var(--font-sans)", fontSize: 13 } }}
        />
      </body>
    </html>
  );
}
