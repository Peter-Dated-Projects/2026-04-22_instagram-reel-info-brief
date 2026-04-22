import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel Brief — Instagram Reel Insights",
  description:
    "Paste an Instagram Reel URL and get AI-powered summaries, transcripts, and structured insights in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
