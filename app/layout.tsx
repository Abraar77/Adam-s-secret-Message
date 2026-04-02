import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Draw Me",
  description:
    "Create a private drawing inbox. Share one public link, collect sketches, and keep submissions owner-only.",
  openGraph: {
    title: "Draw Me",
    description:
      "Type your name, generate a public drawing link, and keep every submission private.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.12),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_55%,#111827_100%)] text-slate-50">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_30%_40%,_rgba(96,165,250,0.08),transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(251,191,36,0.06),transparent_24%)]" />
        <div className="relative flex-1">{children}</div>
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}
