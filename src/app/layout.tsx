import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAKJANG — 당신의 단톡방은 이미 막장드라마다",
  description: "Your group chat, remade as an over-the-top Korean makjang K-drama trailer with real message receipts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=JetBrains+Mono:wght@400;600;700&family=Nanum+Myeongjo:wght@700;800&family=Song+Myung&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen bg-[#0B0B0C] text-[#F5F5F5] bg-grain antialiased selection:bg-[#D4B26A] selection:text-[#0B0B0C]">
        {children}
      </body>
    </html>
  );
}
