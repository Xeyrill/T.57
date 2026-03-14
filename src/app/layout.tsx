import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "DevOps Agent — T.57 // Repo Intelligence",
  description:
    "Multi-agent DevOps tool that reviews repositories, detects vulnerabilities, and maintains code health. Built by Team 57.",
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
