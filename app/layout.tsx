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
        <header className="relative z-10 flex items-center justify-end gap-3 px-4 py-3">
          <a
            href="https://x.com/Adam1_2_"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Follow Adam Lame
          </a>
          <a
            href="https://www.instagram.com/adam1_2__/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/20 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Instagram
          </a>
        </header>
        <div className="relative flex-1">{children}</div>
        <Toaster position="top-right" theme="dark" />
      </body>
    </html>
  );
}
