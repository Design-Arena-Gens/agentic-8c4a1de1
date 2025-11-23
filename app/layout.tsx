import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Insight Studio",
  description: "Upload and analyze images directly in your browser."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
