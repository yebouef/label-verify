import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Label Verification — TTB Compliance Prototype",
  description: "Verify alcohol beverage labels against application data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
