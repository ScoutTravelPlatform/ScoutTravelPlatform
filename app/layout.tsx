import Sidebar from "./components/Sidebar";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scout Travel",
  description: "The Intelligence Platform for Travel Advisors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#f6f8f7]">
        <a href="#main-content" className="sr-only z-[100] rounded-lg bg-white px-4 py-3 font-semibold text-[#0f6d78] focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to main content</a>
        <div className="flex min-h-screen">
          <Sidebar />
          <div id="main-content" className="min-w-0 flex-1 pb-24 lg:pb-0">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
