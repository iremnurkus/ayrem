import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "İrem Nur Kuş | Full Stack Web & Mobile Developer",
  description:
    "İrem Nur Kuş'un kişisel portfolyosu. Web ve mobil uygulama projelerini keşfedin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
