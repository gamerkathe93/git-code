import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "GitCode", template: "%s · GitCode" },
  description: "A self-hosted Git repository management platform with CI/CD, issues, and wikis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
