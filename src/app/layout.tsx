import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "막장톡 — 우리 단톡방이 막장드라마가 된다",
  description:
    "어젯밤 우리 단톡방이, 오늘 밤 10시 특별기획이 됩니다. Your group chat, remade as a K-drama — every twist backed by a real message.",
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/icon-180.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/brand/icon-32.png"],
  },
  openGraph: {
    title: "막장톡 — 우리 단톡방이 막장드라마가 된다",
    description:
      "어젯밤 우리 단톡방이, 오늘 밤 10시 특별기획이 됩니다. Your group chat, remade as a K-drama — every twist backed by a real message.",
    images: [
      {
        url: "/brand/og.jpg",
        width: 1200,
        height: 630,
        alt: "막장톡 MAKJANG TALK",
      },
    ],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "막장톡 — 우리 단톡방이 막장드라마가 된다",
    description:
      "어젯밤 우리 단톡방이, 오늘 밤 10시 특별기획이 됩니다. Your group chat, remade as a K-drama — every twist backed by a real message.",
    images: ["/brand/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=JetBrains+Mono:wght@400;600;700&family=Nanum+Myeongjo:wght@700;800&family=Song+Myung&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen bg-[#0B0B0C] text-[#F5F5F5] bg-grain antialiased selection:bg-[#D4B26A] selection:text-[#0B0B0C] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
