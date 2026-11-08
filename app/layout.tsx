import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Web fallback for the mobile dashboard's SF Pro-first type stack (see the
// --db-* tokens in globals.css). Loaded here, same next/font/google pattern
// as any other project font, and exposed as a CSS variable so it only comes
// into play where the dashboard tokens reference it.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ads Chat",
  description: "Chat with Claude about your Meta ad account's performance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
