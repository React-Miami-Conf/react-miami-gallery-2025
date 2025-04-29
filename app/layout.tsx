import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://2025.reactmiami.com/"),
  title: "React Miami Gallery",
  description: "React Miami 2025 Image Gallery",
  openGraph: {
    title: {
      template: "React Miami Gallery",
      default: "React Miami 2025 Image Gallery",
    },
    images: "/og.png",
    siteName: "React Miami",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
