import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GatewayChat",
  description: "Lightweight chatbot management for client websites.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
