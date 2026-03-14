import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "RepoGuardian — AI-Powered Repository Analysis",
  description:
    "Multi-agent AI tool that scans GitHub repositories for security vulnerabilities, code quality issues, and documentation gaps. Built by Team 57.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${spaceMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
