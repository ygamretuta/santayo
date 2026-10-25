import type { Metadata } from "next";

// Keep the admin out of search results.
export const metadata: Metadata = {
  title: "Admin · Santayo",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
