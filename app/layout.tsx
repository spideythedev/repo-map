import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoMap — See how a codebase is connected",
  description:
    "Explore the structure and relationships inside any public GitHub repository."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}