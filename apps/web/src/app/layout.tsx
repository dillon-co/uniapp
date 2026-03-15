import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniApp — City Coordination Platform",
  description: "AI-powered city coordination platform for events, venues, and community engagement",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
